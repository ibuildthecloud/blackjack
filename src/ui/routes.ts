import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/bash/:session_id/:exec_id", "routes/shell.tsx"),
  route("/game/:gameId", "routes/blackjack.tsx"),
] satisfies RouteConfig;
