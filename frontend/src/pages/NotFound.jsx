import { Link } from "react-router-dom";
import { PackageSearch } from "lucide-react";
import Button from "../components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <PackageSearch size={34} className="text-text-faint" />
      <h1 className="font-display text-xl font-semibold text-text">Page not found</h1>
      <p className="max-w-sm text-[13.5px] text-text-muted">
        There's nothing tagged at this address. It may have been moved or never existed.
      </p>
      <Link to="/">
        <Button className="mt-2">Back to dashboard</Button>
      </Link>
    </div>
  );
}
