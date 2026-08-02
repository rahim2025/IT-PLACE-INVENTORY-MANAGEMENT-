export default function PageHeader({ title, description, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-[24px] font-semibold tracking-tight text-text">{title}</h1>
        {description && <p className="mt-1 text-[14.5px] text-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
