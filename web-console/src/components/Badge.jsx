const Badge = ({ status }) => {
  const styles = {
    stable: "bg-emerald-50 text-emerald-600 border-emerald-200",
    repaired: "bg-amber-50 text-amber-600 border-amber-200",
    blocked: "bg-red-50 text-red-600 border-red-200",
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded border ${styles[status]}`}>
      {status}
    </span>
  );
};

export default Badge;
