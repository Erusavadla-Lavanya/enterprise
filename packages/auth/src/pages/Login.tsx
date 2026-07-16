import LoginForm from "../components/LoginForm";

interface LoginProps {
  onRegister: () => void;
  onForgotPassword: () => void;
}

export default function Login({
  onRegister,
  onForgotPassword,
}: LoginProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6 w-full">
      <LoginForm
        onRegister={onRegister}
        onForgotPassword={onForgotPassword}
      />
    </div>
  );
}
