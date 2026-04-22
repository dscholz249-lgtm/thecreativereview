import { Archive } from "@/components/cr-icons";
import { archiveAssetAction } from "@/app/(app)/assets/actions";

export function ArchiveAssetForm({ assetId }: { assetId: string }) {
  return (
    <form action={archiveAssetAction}>
      <input type="hidden" name="id" value={assetId} />
      <button type="submit" className="cr-btn cr-btn-sm cr-btn-ghost">
        <Archive size={14} /> Archive
      </button>
    </form>
  );
}
