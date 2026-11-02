"use client";

import { Camera, FileUp } from "lucide-react";
import { useId, useRef, useState, useTransition } from "react";

import { Notice } from "@/components/ui/notice";
import type { FormState } from "@/lib/forms";

type UploadAction = (formData: FormData) => Promise<FormState>;

const MAX_SIDE = 2000;

/**
 * Achica una foto antes de subirla: menos datos en el teléfono (4G) y, al
 * volver a dibujarla, se descartan los metadatos EXIF (que pueden incluir la
 * ubicación). Los PDF se suben tal cual. Si el navegador no puede leer la
 * imagen (por ejemplo, HEIC fuera del iPhone), sube el original y el
 * servidor decide.
 */
async function prepare(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

/**
 * Agregar fotos o un PDF a un documento del legajo (diseño IngresoDocumentos,
 * F.6: cámara y varias fotos). Sube de a una para no superar el límite.
 */
export function DocumentUploader({ upload }: { upload: UploadAction }) {
  const cameraId = useId();
  const fileId = useId();
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<FormState>(null);
  const [progress, setProgress] = useState<string | null>(null);

  function onFiles(fileList: FileList | null) {
    const selected = Array.from(fileList ?? []);
    if (selected.length === 0) return;
    setResult(null);
    startTransition(async () => {
      let last: FormState = null;
      for (const [index, file] of selected.entries()) {
        setProgress(
          selected.length > 1 ? `Subiendo ${index + 1} de ${selected.length}…` : "Subiendo…",
        );
        const blob = await prepare(file);
        const data = new FormData();
        data.append("archivo", blob, blob === file ? file.name : "foto.jpg");
        last = await upload(data);
        if (last?.error) break;
      }
      setProgress(null);
      setResult(
        last?.error
          ? last
          : { success: selected.length > 1 ? "Archivos guardados." : "Archivo guardado." },
      );
      for (const element of [camera.current, picker.current]) if (element) element.value = "";
    });
  }

  const buttonClass =
    "inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border bg-card px-4 text-[15px] font-medium hover:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-60";

  return (
    <div className="flex flex-col gap-2">
      {progress ? (
        <p role="status" className="text-sm font-medium">
          {progress}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <label htmlFor={cameraId} aria-disabled={pending} className={buttonClass}>
            <Camera aria-hidden="true" className="size-4" />
            Sacar foto
          </label>
          <label htmlFor={fileId} aria-disabled={pending} className={buttonClass}>
            <FileUp aria-hidden="true" className="size-4" />
            Elegir archivo
          </label>
        </div>
      )}
      <input
        ref={camera}
        id={cameraId}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={pending}
        className="sr-only"
        onChange={(event) => onFiles(event.target.files)}
      />
      <input
        ref={picker}
        id={fileId}
        type="file"
        accept="image/*,application/pdf"
        multiple
        disabled={pending}
        className="sr-only"
        onChange={(event) => onFiles(event.target.files)}
      />
      {result?.error ? <Notice tone="error">{result.error}</Notice> : null}
      {result?.success ? <Notice tone="success">{result.success}</Notice> : null}
    </div>
  );
}
