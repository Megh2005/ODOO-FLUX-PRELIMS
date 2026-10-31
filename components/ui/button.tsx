import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl text-sm font-bold whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-amber-500/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-amber-500 hover:bg-amber-400 text-slate-950 font-black border-b-2 border-amber-600 shadow-sm active:border-b-0 active:translate-y-[1px]",
        secondary:
          "border border-slate-300 bg-white/90 text-slate-800 hover:bg-slate-100 hover:text-slate-950 font-bold shadow-2xs",
        outline:
          "border border-slate-300 bg-white/90 text-slate-800 hover:bg-slate-100 hover:text-slate-950 font-bold shadow-2xs",
        ghost:
          "border border-slate-300 bg-white/90 text-slate-800 hover:bg-slate-100 hover:text-slate-950 font-bold shadow-2xs",
        destructive:
          "bg-rose-600 hover:bg-rose-500 text-white font-black border-b-2 border-rose-700 shadow-sm active:border-b-0",
        link: "text-amber-600 underline-offset-4 hover:underline font-bold",
      },
      size: {
        default: "h-9 gap-2 px-4 py-2",
        xs: "h-6 gap-1 px-2 text-xs",
        sm: "h-8 gap-1.5 px-3 text-xs",
        lg: "h-11 gap-2.5 px-6 text-sm",
        icon: "size-9",
        "icon-xs": "size-6",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
