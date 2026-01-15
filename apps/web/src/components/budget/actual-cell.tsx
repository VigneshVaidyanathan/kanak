'use client';

interface ActualCellProps {
  amount: number;
}

export function ActualCell({ amount }: ActualCellProps) {
  const formattedAmount = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="text-sm text-right w-full flex justify-end">
      <div className="font-semibold">₹{formattedAmount}</div>
    </div>
  );
}
