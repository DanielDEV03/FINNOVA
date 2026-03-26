SELECT "Id", "Name", "Email" FROM "Users" LIMIT 5;
SELECT COUNT(*) as total_incomes FROM "Incomes";
SELECT COUNT(*) as total_expenses FROM "Expenses";
SELECT i."UserId", COUNT(*) as cnt FROM "Incomes" i GROUP BY i."UserId";
SELECT e."UserId", COUNT(*) as cnt FROM "Expenses" e GROUP BY e."UserId";
