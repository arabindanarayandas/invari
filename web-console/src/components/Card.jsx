const Card = ({ children, className = "", onClick }) => (
  <div
    className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);

export default Card;
