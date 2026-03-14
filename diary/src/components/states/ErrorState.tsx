type ErrorStateProps = {
  message: string;
};

export default function ErrorState({ message }: ErrorStateProps) {
  return <div className="text-sm text-red-600">{message}</div>;
}
