import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { UserCog, Trash2 } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Field";
import DataTable from "../components/ui/DataTable";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import AssetTag from "../components/ui/AssetTag";
import { SkeletonRows } from "../components/ui/Skeleton";
import { useGetUsersQuery, useUpdateUserRoleMutation, useDeleteUserMutation } from "../app/apiSlice";
import { selectAuth } from "../features/auth/authSlice";
import { pushed } from "../features/toast/toastSlice";
import { formatDate } from "../lib/format";

const ROLE_TONE = { owner: "rose", employee: "solder", user: "neutral" };

export default function Users() {
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector(selectAuth);
  const { data: usersRes, isLoading } = useGetUsersQuery();
  const [updateUserRole] = useUpdateUserRoleMutation();
  const [deleteUser] = useDeleteUserMutation();

  const users = usersRes?.data ?? [];

  const [deletingId, setDeletingId] = useState(null);
  const deletingUser = users.find((u) => u._id === deletingId);
  const [deleteError, setDeleteError] = useState("");

  async function handleRoleChange(user, role) {
    if (role === user.role) return;
    try {
      await updateUserRole({ id: user._id, role }).unwrap();
      dispatch(pushed({ message: `${user.name} is now ${role === "user" ? "a plain user" : `an ${role}`}.` }));
    } catch (err) {
      dispatch(pushed({ message: err?.data?.message ?? "Couldn't change this account's role.", variant: "error" }));
    }
  }

  async function handleDelete() {
    if (!deletingUser) return;
    try {
      await deleteUser(deletingUser._id).unwrap();
      dispatch(pushed({ message: `${deletingUser.name}'s account was deleted.` }));
      setDeleteError("");
    } catch (err) {
      setDeleteError(err?.data?.message ?? "Couldn't delete this account.");
      throw err;
    }
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description={`${users.length} accounts · grant access to new sign-ups or manage existing roles.`}
      />

      <Card>
        {isLoading ? (
          <SkeletonRows rows={5} cols={4} />
        ) : (
          <DataTable
            searchKeys={["name", "email"]}
            searchPlaceholder="Search accounts…"
            columns={[
              {
                key: "name",
                header: "Account",
                render: (r) => (
                  <div>
                    <p className="font-medium text-text">
                      {r.name} {r._id === currentUser?._id && <span className="text-text-faint">(you)</span>}
                    </p>
                    <p className="text-[12.5px] text-text-faint">{r.email}</p>
                  </div>
                ),
              },
              {
                key: "role",
                header: "Role",
                render: (r) => <AssetTag tone={ROLE_TONE[r.role] ?? "neutral"}>{r.role}</AssetTag>,
              },
              { key: "createdAt", header: "Signed up", render: (r) => formatDate(r.createdAt) },
              {
                key: "actions",
                header: "",
                render: (r) => {
                  const isSelf = r._id === currentUser?._id;
                  return (
                    <div className="flex items-center justify-end gap-2">
                      <Select
                        value={r.role}
                        onChange={(e) => handleRoleChange(r, e.target.value)}
                        disabled={isSelf}
                        aria-label={`Change role for ${r.name}`}
                        className="!h-8.5 w-32 !text-[13px]"
                      >
                        <option value="user">User</option>
                        <option value="employee">Employee</option>
                        <option value="owner">Owner</option>
                      </Select>
                      <button
                        onClick={() => {
                          setDeletingId(r._id);
                          setDeleteError("");
                        }}
                        disabled={isSelf}
                        aria-label={`Delete ${r.name}`}
                        className="rounded-[5px] p-1.5 text-text-faint hover:bg-fault/10 hover:text-fault disabled:pointer-events-none disabled:opacity-30"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                },
              },
            ]}
            rows={users}
            keyField="_id"
            pageSize={10}
            emptyState={<EmptyRoleState />}
          />
        )}
      </Card>

      <ConfirmDialog
        open={!!deletingUser}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title={`Delete ${deletingUser?.name ?? "this account"}?`}
        description={deleteError || "This can't be undone. They'll need to sign up again to regain access."}
        confirmLabel="Delete account"
      />
    </div>
  );
}

function EmptyRoleState() {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <UserCog size={28} className="text-text-faint" />
      <p className="text-[13.5px] text-text-muted">No accounts yet.</p>
    </div>
  );
}
