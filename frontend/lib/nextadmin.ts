import { NextAdminOptions } from "@premieroctet/next-admin";

export const options: NextAdminOptions = {
  title: "RxVKG Admin",
  model: {
    User: {
      toString: (user) => `${user.username ?? "—"} <${user.email ?? "—"}>`,
      title: "Users",
      list: {
        display: ["id", "username", "email", "role", "createdAt"],
        search: ["username", "email"],
      },
      edit: {
        display: ["username", "email", "role"],
      },
    },
  },
};
