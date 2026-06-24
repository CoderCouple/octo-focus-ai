"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Columns2, FileText, LayoutGrid, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCreateProjectShape, type ProjectShape } from "../hooks/use-projects";

const FormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(2000).optional(),
});
type FormValues = z.infer<typeof FormSchema>;

interface CreateProjectDialogProps {
  workspaceId: string;
  trigger?: React.ReactNode;
  /**
   * When set, the dialog skips the "What's inside?" picker and goes
   * straight to creating a project with that shape. Used by the
   * workspace-home `New note` / `New canvas` quick actions where the
   * shape is already implied by the button label.
   */
  fixedShape?: ProjectShape;
}

const SHAPE_COPY: Record<ProjectShape, { title: string; description: string }> = {
  note: {
    title: "New note",
    description: "Creates a project with a single note. Add a canvas later if you want one.",
  },
  canvas: {
    title: "New canvas",
    description: "Creates a project with a single canvas. Add a note later if you want one.",
  },
  both: {
    title: "New project",
    description: "Projects group notes and canvases. Pick what you want inside.",
  },
  empty: {
    title: "New project",
    description: "Create an empty project — add a note or canvas after.",
  },
};

export function CreateProjectDialog({
  workspaceId,
  trigger,
  fixedShape,
}: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [shape, setShape] = useState<ProjectShape>(fixedShape ?? "both");
  const create = useCreateProjectShape(workspaceId);
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { name: "", description: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(
      {
        shape: fixedShape ?? shape,
        body: {
          name: values.name,
          ...(values.description ? { description: values.description } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success("Project created");
          form.reset();
          setShape(fixedShape ?? "both");
          setOpen(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  });

  const copy = SHAPE_COPY[fixedShape ?? "both"];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset();
          setShape(fixedShape ?? "both");
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            {copy.title}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              placeholder="Architecture Notes"
              disabled={create.isPending}
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              placeholder="What goes in this project?"
              disabled={create.isPending}
              {...form.register("description")}
            />
          </div>
          {fixedShape ? null : (
            <div className="grid gap-2">
              <Label>What&apos;s in this project?</Label>
              <ToggleGroup
                type="single"
                value={shape}
                onValueChange={(v) => v && setShape(v as ProjectShape)}
                variant="outline"
                size="sm"
                className="justify-start"
              >
                <ToggleGroupItem value="note">
                  <FileText className="h-3.5 w-3.5" />
                  Just a note
                </ToggleGroupItem>
                <ToggleGroupItem value="canvas">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Just a canvas
                </ToggleGroupItem>
                <ToggleGroupItem value="both">
                  <Columns2 className="h-3.5 w-3.5" />
                  Both
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || !form.formState.isValid}>
              {create.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                </>
              ) : (
                copy.title
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
