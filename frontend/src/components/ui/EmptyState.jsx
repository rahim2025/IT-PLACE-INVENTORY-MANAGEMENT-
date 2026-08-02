export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {Icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-border-strong text-text-faint">
          <Icon size={20} />
        </div>
      )}
      <div>
        <p className="font-display text-[16px] font-semibold text-text">{title}</p>
        {description && <p className="mt-1 max-w-sm text-[14px] text-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
