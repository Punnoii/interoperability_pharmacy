import { NextAdminOptions } from "@premieroctet/next-admin";

// next-admin dashboard config, only the User model is exposed, list/search/edit columns spelled out
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
