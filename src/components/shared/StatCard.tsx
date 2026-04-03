interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  variant?: "default" | "gold" | "green";
}

const variants = {
  default: {
    bg: "bg-surface-container-low",
    iconColor: "text-primary",
    labelColor: "text-on-surface-variant",
    valueColor: "text-on-surface",
  },
  gold: {
    bg: "bg-tertiary-fixed",
    iconColor: "text-tertiary",
    labelColor: "text-on-tertiary-fixed-variant",
    valueColor: "text-on-tertiary-fixed-variant",
  },
  green: {
    bg: "bg-success-light",
    iconColor: "text-success",
    labelColor: "text-success/70",
    valueColor: "text-success",
  },
};

export default function StatCard({
  icon,
  label,
  value,
  variant = "default",
}: StatCardProps) {
  const v = variants[variant];

  return (
    <div
      className={`flex-shrink-0 w-32 aspect-square rounded-xl ${v.bg} flex flex-col justify-between p-4 shadow-sm`}
    >
      <span className={`material-symbols-outlined ${v.iconColor}`}>
        {icon}
      </span>
      <div>
        <p
          className={`text-[10px] uppercase tracking-widest font-bold ${v.labelColor}`}
        >
          {label}
        </p>
        <p className={`text-lg font-bold ${v.valueColor}`}>{value}</p>
      </div>
    </div>
  );
}
