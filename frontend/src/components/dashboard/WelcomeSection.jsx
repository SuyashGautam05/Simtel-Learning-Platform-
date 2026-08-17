import { useAuth } from "../../context/AuthContext.jsx";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function WelcomeSection({ authorizedCount, lockedCount }) {
  const { user } = useAuth();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-navy p-6 text-white animate-fade-in sm:p-8">
      <div className="absolute -right-10 -top-10 h-40 w-40 animate-float rounded-full bg-gold/10 blur-3xl" />
      <div className="relative z-10">
        <p className="text-sm text-navy-200">
          {greeting()}, {user?.name?.split(" ")[0]} 👋
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Welcome back to your learning space</h1>
        <p className="mt-2 max-w-xl text-sm text-navy-200">
          You have <span className="font-semibold text-gold">{authorizedCount}</span> module
          {authorizedCount === 1 ? "" : "s"} unlocked
          {lockedCount > 0 && (
            <>
              {" "}
              and <span className="font-semibold text-white">{lockedCount}</span> more waiting for a
              product key.
            </>
          )}
        </p>
      </div>
    </div>
  );
}