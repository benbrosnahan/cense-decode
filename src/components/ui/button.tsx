import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// 48px default and 40px small. Both clear the WCAG 2.2 AA 24px target minimum
// with room to spare on touch.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full border border-transparent font-semibold whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary:
          "border-border-strong bg-card text-foreground hover:border-primary hover:bg-secondary",
        ghost: "text-foreground hover:bg-secondary",
        link: "text-primary underline underline-offset-4 hover:no-underline",
        inverse: "bg-card text-primary hover:bg-secondary",
      },
      size: {
        default: "min-h-12 gap-2 px-5 text-base",
        sm: "min-h-10 gap-1.5 px-4 text-sm",
        lg: "min-h-14 gap-2 px-6 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
