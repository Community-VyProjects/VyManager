import { toast } from "@/components/ui/use-toast";

export async function executeSavingMethod() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const response = await fetch(`${apiUrl}/api/check-unsaved-changes`);
  var unsavedChanges = false;

  if (!response.ok) {
    throw new Error(
      `Server returned ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (data.success === true && data.data !== null) {
    unsavedChanges = data.data;
  } else {
    throw new Error(
      data.error || "Failed to confirm if there are unsaved changes"
    );
  }

  if (unsavedChanges === true) {
    // Only continue when there are unsaved changes
    var savingMethod = sessionStorage.getItem("savingMethod") || "confirmation";

    if (savingMethod === "direct") {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/api/config-file/save`, {
        method: "POST",
        headers: {
          accept: "application/json",
        },
      });
      var unsavedChanges = false;

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.success === true) {
        toast({
          title: "Configuration saved successfully",
          description: `Current saving method is: ${savingMethod}`,
        });

        // Because the saving method is direct, immediately mark unsavedChanges as false
        const responseState = await fetch(
          `${apiUrl}/api/set-unsaved-changes/false`,
          {
            method: "POST",
            headers: {
              accept: "application/json",
            },
          }
        );

        if (!responseState.ok) {
          throw new Error(
            `Server returned ${responseState.status} ${responseState.statusText}`
          );
        }
      } else {
        throw new Error(data.error || "Failed to save configuration");
      }
    }
  }
}
