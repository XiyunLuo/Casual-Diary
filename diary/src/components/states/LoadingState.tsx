type LoadingStateProps = {
  text?: string;
};

export default function LoadingState({ text = "加载中..." }: LoadingStateProps) {
  return <div className="text-sm text-muted-foreground">{text}</div>;
}
