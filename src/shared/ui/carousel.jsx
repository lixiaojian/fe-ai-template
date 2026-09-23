/**
 * @file 轮播组件（Carousel）
 * @description 基于 embla-carousel-react 的 shadcn/ui Base UI（base-nova）风格轮播。
 * 提供 Carousel / CarouselContent / CarouselItem 与可选的前后翻页按钮，
 * 并通过 setApi 暴露 embla 实例，供外置选择器（如缩略图栏）联动控制。
 * @see https://ui.shadcn.com/docs/components/carousel
 */

import * as React from 'react';
import { cn } from 'cn';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';

const CarouselContext = React.createContext(null);

/**
 * 读取轮播上下文，必须在 <Carousel /> 内部使用。
 * @returns {Object} 含 carouselRef、api、scrollPrev/scrollNext 与 orientation 的上下文。
 */
function useCarousel() {
    const context = React.useContext(CarouselContext);

    if (!context) {
        throw new Error('useCarousel must be used within a <Carousel />');
    }

    return context;
}

/**
 * Carousel 根组件。
 * @param {Object} props - 组件属性。
 * @param {('horizontal'|'vertical')} [props.orientation='horizontal'] - 排列方向。
 * @param {Object} [props.opts] - embla 初始化参数，如 { loop: true, align: 'start' }。
 * @param {Array} [props.plugins] - embla 插件数组，如 [Autoplay()]。
 * @param {Function} [props.setApi] - 接收 embla api 实例的回调，用于外部控制与监听。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.ReactNode} props.children - 轮播内容（CarouselContent 等）。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function Carousel({
    orientation = 'horizontal',
    opts,
    setApi,
    plugins,
    className,
    children,
    ...props
}) {
    const [carouselRef, api] = useEmblaCarousel(
        {
            ...opts,
            axis: orientation === 'horizontal' ? 'x' : 'y',
        },
        plugins
    );
    const [canScrollPrev, setCanScrollPrev] = React.useState(false);
    const [canScrollNext, setCanScrollNext] = React.useState(false);

    const onSelect = React.useCallback((instance) => {
        if (!instance) return;
        setCanScrollPrev(instance.canScrollPrev());
        setCanScrollNext(instance.canScrollNext());
    }, []);

    const scrollPrev = React.useCallback(() => {
        api?.scrollPrev();
    }, [api]);

    const scrollNext = React.useCallback(() => {
        api?.scrollNext();
    }, [api]);

    const handleKeyDown = React.useCallback(
        (event) => {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                scrollPrev();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                scrollNext();
            }
        },
        [scrollPrev, scrollNext]
    );

    React.useEffect(() => {
        if (!api || !setApi) return;
        setApi(api);
    }, [api, setApi]);

    React.useEffect(() => {
        if (!api) return;
        // embla 的 api 挂载后才可用，首帧滚动状态只能在这里同步一次。
        // 这是 embla 官方推荐的订阅写法，属可控的一次性同步，不是级联更新。
        // eslint-disable-next-line react-hooks/set-state-in-effect
        onSelect(api);
        api.on('reInit', onSelect);
        api.on('select', onSelect);

        return () => {
            api?.off('select', onSelect);
            api?.off('reInit', onSelect);
        };
    }, [api, onSelect]);

    return (
        <CarouselContext.Provider
            value={{
                carouselRef,
                api: api,
                opts,
                orientation: orientation || (opts?.axis === 'y' ? 'vertical' : 'horizontal'),
                scrollPrev,
                scrollNext,
                canScrollPrev,
                canScrollNext,
            }}
        >
            <div
                onKeyDownCapture={handleKeyDown}
                className={cn('relative', className)}
                role="region"
                aria-roledescription="carousel"
                data-slot="carousel"
                {...props}
            >
                {children}
            </div>
        </CarouselContext.Provider>
    );
}

/**
 * 轮播轨道容器，负责横向滚动与视口裁切。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名；单页一图时可传 'ml-0' 抵消默认间距。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function CarouselContent({ className, ...props }) {
    const { carouselRef, orientation } = useCarousel();

    return (
        <div ref={carouselRef} className="overflow-hidden" data-slot="carousel-content">
            <div
                className={cn(
                    'flex',
                    orientation === 'horizontal' ? '-ml-4' : '-mt-4 flex-col',
                    className
                )}
                {...props}
            />
        </div>
    );
}

/**
 * 单张轮播页，默认占满轨道宽度。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名；单页一图时可传 'pl-0' 抵消默认间距。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function CarouselItem({ className, ...props }) {
    const { orientation } = useCarousel();

    return (
        <div
            role="group"
            aria-roledescription="slide"
            data-slot="carousel-item"
            className={cn(
                'min-w-0 shrink-0 grow-0 basis-full',
                orientation === 'horizontal' ? 'pl-4' : 'pt-4',
                className
            )}
            {...props}
        />
    );
}

/**
 * 上一页按钮。默认绝对定位在轨道左侧；项目「平面直角」风格下通常不渲染，改用外置选择器。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {string} [props.variant='outline'] - 按钮变体，透传给 Button。
 * @param {string} [props.size='icon-sm'] - 按钮尺寸，透传给 Button。
 * @param {React.ComponentProps<typeof Button>} props... - 其他 Button 属性。
 * @returns {JSX.Element}
 */
function CarouselPrevious({ className, variant = 'outline', size = 'icon-sm', ...props }) {
    const { orientation, scrollPrev, canScrollPrev } = useCarousel();

    return (
        <Button
            data-slot="carousel-previous"
            variant={variant}
            size={size}
            className={cn(
                'absolute touch-manipulation rounded-full',
                orientation === 'horizontal'
                    ? 'inset-y-0 -left-12 my-auto'
                    : '-top-12 left-1/2 -translate-x-1/2 rotate-90',
                className
            )}
            disabled={!canScrollPrev}
            onClick={scrollPrev}
            {...props}
        >
            <ChevronLeftIcon />
            <span className="sr-only">Previous slide</span>
        </Button>
    );
}

/**
 * 下一页按钮。默认绝对定位在轨道右侧；项目「平面直角」风格下通常不渲染，改用外置选择器。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {string} [props.variant='outline'] - 按钮变体，透传给 Button。
 * @param {string} [props.size='icon-sm'] - 按钮尺寸，透传给 Button。
 * @param {React.ComponentProps<typeof Button>} props... - 其他 Button 属性。
 * @returns {JSX.Element}
 */
function CarouselNext({ className, variant = 'outline', size = 'icon-sm', ...props }) {
    const { orientation, scrollNext, canScrollNext } = useCarousel();

    return (
        <Button
            data-slot="carousel-next"
            variant={variant}
            size={size}
            className={cn(
                'absolute touch-manipulation rounded-full',
                orientation === 'horizontal'
                    ? 'inset-y-0 -right-12 my-auto'
                    : '-bottom-12 left-1/2 -translate-x-1/2 rotate-90',
                className
            )}
            disabled={!canScrollNext}
            onClick={scrollNext}
            {...props}
        >
            <ChevronRightIcon />
            <span className="sr-only">Next slide</span>
        </Button>
    );
}

export { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, useCarousel };
