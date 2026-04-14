import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";

export const AppLayout = () => {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <div className="container max-w-7xl py-6 px-4 md:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
