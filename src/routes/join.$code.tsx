import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/join/$code")({
  component: () => {
    const { code } = Route.useParams();
    return <Navigate to="/multiplayer-setup" search={{ join: code.toUpperCase() }} />;
  },
});
