import { createFileRoute } from "@tanstack/react-router";
import HomeView from "#/components/HomeView";

function Home() {
	return <HomeView />;
}

export const Route = createFileRoute("/")({ component: Home });
