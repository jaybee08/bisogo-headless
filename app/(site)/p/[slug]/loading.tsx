import { LoadingState } from "@/components/state/loading";

export default function Loading() {
  return (
    <div className="container py-10">
      <LoadingState label="Loading page…" />
    </div>
  );
}
