import type { DisplayCarousel } from "./sdk-types.js";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { cn } from "../lib/utils";
import { useTranslation } from "../i18n/index.js";

export function CarouselRenderer({ title, items }: DisplayCarousel) {
  const { t, locale } = useTranslation();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, dragFree: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <div className="flex flex-col gap-3">
      {title && <p className="text-sm font-medium text-foreground">{title}</p>}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shrink-0"
          onClick={scrollPrev}
          disabled={!canScrollPrev}
          aria-label={t("carousel.previous")}
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="overflow-hidden flex-1" ref={emblaRef}>
          <div className="flex">
            {items.map((item, index) => (
              <div key={index} className="flex-[0_0_80%] min-w-0 pl-3 first:pl-0">
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
                    <CarouselCard item={item} />
                  </a>
                ) : (
                  <CarouselCard item={item} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="rounded-full shrink-0"
          onClick={scrollNext}
          disabled={!canScrollNext}
          aria-label={t("carousel.next")}
          type="button"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5" role="tablist" aria-label={t("carousel.slides")}>
          {items.map((_, index) => (
            <button
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                index === selectedIndex ? "bg-primary" : "bg-muted"
              )}
              onClick={() => emblaApi?.scrollTo(index)}
              role="tab"
              aria-selected={index === selectedIndex}
              aria-label={`Slide ${index + 1}`}
              type="button"
            />
          ))}
        </div>
      )}
    </div>
  );
}

type CarouselItem = DisplayCarousel["items"][number];

function CarouselCard({ item }: { item: CarouselItem }) {
  const { locale } = useTranslation();
  return (
    <Card className="overflow-hidden">
      {item.image && (
        <div className="aspect-video overflow-hidden">
          <img src={item.image} alt={item.title} loading="lazy" className="w-full h-full object-cover" />
        </div>
      )}
      <CardContent className="p-3 space-y-1">
        <p className="font-medium text-sm text-foreground">{item.title}</p>
        {item.subtitle && (
          <p className="text-xs text-muted-foreground">{item.subtitle}</p>
        )}
        {item.price && (
          <p className="text-sm font-bold text-foreground">
            {new Intl.NumberFormat(locale, { style: "currency", currency: item.price.currency }).format(item.price.value)}
          </p>
        )}
        {item.badges && item.badges.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {item.badges.map((badge, i) => (
              <Badge key={i} variant={(badge.variant as string) === "destructive" ? "destructive" : (badge.variant as string) === "secondary" ? "secondary" : "default"}>
                {badge.label}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
