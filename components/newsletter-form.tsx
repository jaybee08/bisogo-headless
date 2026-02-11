"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  email: z.string().email(),
});

type Values = z.infer<typeof schema>;

export function NewsletterForm() {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const { register, handleSubmit, formState, reset } = form;

  const onSubmit = async (values: Values) => {
    await new Promise((r) => setTimeout(r, 300));
    reset();
    alert(`Thanks! We'll email ${values.email} when there's something new.`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="email"
          placeholder="you@domain.com"
          {...register("email")}
          className="h-12 w-full sm:flex-1"
        />
        <Button
          type="submit"
          disabled={formState.isSubmitting}
          className="h-12 w-full sm:w-auto"
        >
          {formState.isSubmitting ? "…" : "Subscribe"}
        </Button>
      </div>
    </form>
  );
}