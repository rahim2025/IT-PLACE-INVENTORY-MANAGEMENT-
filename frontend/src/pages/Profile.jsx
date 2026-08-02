import { useSelector } from "react-redux";
import PageHeader from "../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../components/ui/Card";
import AssetTag from "../components/ui/AssetTag";
import { SkeletonRows } from "../components/ui/Skeleton";
import { selectAuth } from "../features/auth/authSlice";
import { useGetActivityLogsQuery } from "../app/apiSlice";
import { formatDateTime } from "../lib/format";

function initials(name = "") {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function Profile() {
  const { user } = useSelector(selectAuth);
  const { data: logsRes, isLoading } = useGetActivityLogsQuery({ limit: 30 });
  const logs = logsRes?.data ?? [];

  return (
    <div>
      <PageHeader title="Profile" description="Your account and recent activity across the shop." />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="h-fit">
          <CardBody className="flex flex-col items-center py-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose/15 font-display text-xl font-semibold text-rose">
              {initials(user?.name)}
            </span>
            <p className="mt-3 font-display text-[17px] font-semibold text-text">{user?.name}</p>
            <p className="text-[13px] text-text-muted">{user?.email}</p>
            <AssetTag tone="rose" className="mt-3">{user?.role}</AssetTag>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Recent activity" description="Product, stock, and record changes across the account" />
          {isLoading ? (
            <SkeletonRows rows={6} cols={2} />
          ) : (
            <CardBody className="max-h-[420px] overflow-y-auto p-0">
              <ul className="divide-y divide-border">
                {logs.map((log) => (
                  <li key={log._id} className="flex items-center justify-between gap-3 px-4.5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-text">
                        <span className="font-medium">{log.userName}</span> · {log.action}
                      </p>
                      <p className="truncate text-[12px] text-text-faint">{log.target}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[11.5px] text-text-faint">{formatDateTime(log.date)}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          )}
        </Card>
      </div>
    </div>
  );
}
