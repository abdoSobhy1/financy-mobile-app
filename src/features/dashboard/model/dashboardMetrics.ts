import { Budget, Category, Transaction } from "../../../shared/types";
import { addMoney, subtractMoney, sumMoney } from "../../../shared/utils";
import { walletService } from "../../wallets/services/walletService";

export interface QuickAddSlot {
  id: string;
  name: string;
  colorName?: string;
  isFallback: boolean;
  iconName: string;
}

export interface OverspentBudgetAlert {
  id: string;
  name: string;
  excess: number;
  spent: number;
  amount: number;
}

export interface SparklinePaths {
  strokePath: string;
  fillPath: string;
}

export function generateSmoothPath(
  data: number[],
  width: number,
  height: number,
): SparklinePaths {
  if (data.length < 2) {
    const midY = height / 2;
    return {
      strokePath: `M 0 ${midY} L ${width} ${midY}`,
      fillPath: `M 0 ${midY} L ${width} ${midY} L ${width} ${height} L 0 ${height} Z`,
    };
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const stepX = width / (data.length - 1);
  const padding = height * 0.2;
  const drawHeight = height - padding * 2;

  const points = data.map((val, i) => ({
    x: i * stepX,
    y: height - padding - ((val - min) / range) * drawHeight,
  }));

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  return {
    strokePath: d,
    fillPath: `${d} L ${width} ${height} L 0 ${height} Z`,
  };
}

export function computeTopExpenseCategories(
  txs: Transaction[],
  catsMap: Record<string, Category>,
  start: Date,
  end: Date,
): QuickAddSlot[] {
  const allExpenseTxs = txs.filter((t) => t.type === "expense" && !t.deleted);

  const periodTxs = allExpenseTxs.filter((t) => {
    const d = new Date(t.date);
    return d >= start && d <= end;
  });

  const periodCategoryIds = new Set(periodTxs.map((t) => t.categoryId));

  let relevantTxs = periodTxs;
  if (periodCategoryIds.size < 3) {
    const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    relevantTxs = allExpenseTxs.filter((t) => new Date(t.date) >= cutoff);
  }

  const scores: Record<string, number> = {};
  const now = Date.now();
  for (const tx of relevantTxs) {
    if (!tx.categoryId) continue;
    const txTime = new Date(tx.date).getTime();
    const daysAgo = Math.max(0, (now - txTime) / (1000 * 60 * 60 * 24));
    const weight = Math.max(0.1, 1 - daysAgo / 60);
    scores[tx.categoryId] = (scores[tx.categoryId] || 0) + weight;
  }

  const sortedCatIds = Object.keys(scores).sort((a, b) => {
    const scoreDiff = (scores[b] || 0) - (scores[a] || 0);
    if (scoreDiff !== 0) return scoreDiff;
    const countA = catsMap[a]?.entryCount || 0;
    const countB = catsMap[b]?.entryCount || 0;
    return countB - countA;
  });

  const slots: QuickAddSlot[] = [];
  const pickedIds = new Set<string>();

  for (const catId of sortedCatIds) {
    if (slots.length >= 10) break;
    const cat = catsMap[catId];
    if (cat && cat.type === "expense" && !cat.deleted) {
      slots.push({
        id: cat.id,
        name: cat.name,
        colorName: cat.color || "bluegrey",
        isFallback: false,
        iconName: cat.icon || "receipt-outline",
      });
      pickedIds.add(cat.id);
    }
  }

  if (slots.length < 10) {
    for (const cat of Object.values(catsMap)) {
      if (slots.length >= 10) break;
      if (cat.type === "expense" && !cat.deleted && !pickedIds.has(cat.id)) {
        slots.push({
          id: cat.id,
          name: cat.name,
          colorName: cat.color || "bluegrey",
          isFallback: false,
          iconName: cat.icon || "cart",
        });
        pickedIds.add(cat.id);
      }
    }
  }

  return slots;
}

export function computeDashboardMetrics(params: {
  allTransactions: Transaction[];
  budgetsMap: Record<string, Budget>;
  categoriesMap: Record<string, Category>;
  secretWalletIds: Set<string>;
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
}) {
  const {
    allTransactions,
    budgetsMap,
    categoriesMap,
    secretWalletIds,
    start,
    end,
    prevStart,
    prevEnd,
  } = params;

  const isSecretExcluded = (t: Transaction) =>
    walletService.isSecretTransactionExcluded(t, secretWalletIds);
  const isAdjustment = (t: Transaction) => t.description === "Balance adjustment";

  const periodTxs = allTransactions.filter((t) => {
    const d = new Date(t.date);
    return d >= start && d <= end;
  });
  const publicPeriodTxs = periodTxs.filter((t) => !isSecretExcluded(t));

  const totalIncome = sumMoney(
    publicPeriodTxs.filter((t) => t.type === "income" && !isAdjustment(t)),
    (t) => t.amount,
  );

  const totalExpenses = sumMoney(
    publicPeriodTxs.filter((t) => !isAdjustment(t) && t.type === "expense"),
    (t) => t.amount,
  );

  const budgetedExpenses = sumMoney(
    publicPeriodTxs.filter(
      (t) => !isAdjustment(t) && Boolean(t.budgetId) && t.type === "expense",
    ),
    (t) => t.amount,
  );

  const balance = subtractMoney(totalIncome, totalExpenses);

  const prevPeriodTxs = allTransactions.filter((t) => {
    const d = new Date(t.date);
    return d >= prevStart && d <= prevEnd;
  });
  const prevPublicPeriodTxs = prevPeriodTxs.filter((t) => !isSecretExcluded(t));
  const prevIncome = sumMoney(
    prevPublicPeriodTxs.filter((t) => t.type === "income" && !isAdjustment(t)),
    (t) => t.amount,
  );
  const prevExpenses = sumMoney(
    prevPublicPeriodTxs.filter((t) => !isAdjustment(t) && t.type === "expense"),
    (t) => t.amount,
  );
  const previousBalance = subtractMoney(prevIncome, prevExpenses);

  let balanceChangePct = 0;
  if (previousBalance !== 0) {
    balanceChangePct =
      ((balance - previousBalance) / Math.abs(previousBalance)) * 100;
  } else if (balance !== 0) {
    balanceChangePct = 100;
  }

  const activeBudgets = Object.values(budgetsMap).filter((b) => !b.deleted);
  const totalBudget = sumMoney(activeBudgets, (b) => b.amount);

  const overspentBudgets: OverspentBudgetAlert[] = [];
  for (const b of activeBudgets) {
    if (b.alertsEnabled !== false && b.amount > 0) {
      const spent = sumMoney(
        publicPeriodTxs.filter(
          (t) =>
            (t.budgetId === b.id ||
              (Boolean(b.categoryId) && t.categoryId === b.categoryId)) &&
            t.type === "expense" &&
            !isAdjustment(t),
        ),
        (t) => t.amount,
      );
      if (spent > b.amount) {
        overspentBudgets.push({
          id: b.id,
          name: b.name,
          excess: subtractMoney(spent, b.amount),
          spent,
          amount: b.amount,
        });
      }
    }
  }

  const sortedPeriodTxs = [...publicPeriodTxs]
    .filter((t) => !isAdjustment(t) && t.type !== "transfer")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = 0;
  const balanceHistory = [0];
  for (const t of sortedPeriodTxs) {
    if (t.type === "income") {
      runningBalance = addMoney(runningBalance, t.amount);
      balanceHistory.push(runningBalance);
    } else if (t.type === "expense") {
      runningBalance = subtractMoney(runningBalance, t.amount);
      balanceHistory.push(runningBalance);
    }
  }
  if (balanceHistory.length < 2) {
    balanceHistory.push(runningBalance);
  }

  const nonSecretTransactions = allTransactions.filter(
    (t) => !isSecretExcluded(t),
  );
  const recentTransactions = [...nonSecretTransactions]
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime() ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  const quickAddSlots = computeTopExpenseCategories(
    nonSecretTransactions,
    categoriesMap,
    start,
    end,
  );

  return {
    totalIncome,
    totalExpenses,
    budgetedExpenses,
    balance,
    balanceChangePct,
    totalBudget,
    overspentBudgets,
    balanceHistory,
    recentTransactions,
    quickAddSlots,
  };
}
