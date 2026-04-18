import { Button } from "@/components/ui/button";
import { archiveAssetAction } from "@/app/(app)/assets/actions";

export function ArchiveAssetForm({ assetId }: { assetId: string }) {
  return (
    <form action={archiveAssetAction}>
      <input type="hidden" name="id" value={assetId} />
      <Button type="submit" variant="outline" size="sm">
        Archive
      </Button>
    </form>
  );
}
