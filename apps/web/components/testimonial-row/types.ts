import type { CardItem } from "@/components/ui/infinite-card-marquee";

export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
  avatarSrc?: string;
  avatarFallback?: string;
};

export type TestimonialCardProps = {
  testimonial: Testimonial;
  className?: string;
};

export type TestimonialRowProps = {
  testimonials: Testimonial[];
  title?: string;
  description?: string;
  rows?: number;
  rowReverse?: boolean | boolean[];
  speed?: "slow" | "normal" | "fast";
  pauseOnHover?: boolean;
  cardWidth?: number | string;
  cardHeight?: number | string;
  gap?: number;
  rowGap?: number;
  className?: string;
};

export type { CardItem };
