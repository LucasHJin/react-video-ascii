export interface DevicePixelSize {
    width: number;
    height: number;
    cssWidth: number;
    cssHeight: number;
}

export function observeDevicePixelSize(el: Element, cb: (size: DevicePixelSize) => void): () => void {
    let lastCssW = 0;
    let lastCssH = 0;
    let disposed = false;
    let removeDprListener: (() => void) | null = null;

    const emitFallback = () => {
        const dpr = window.devicePixelRatio || 1;
        cb({
            width: Math.round(lastCssW * dpr),
            height: Math.round(lastCssH * dpr),
            cssWidth: lastCssW,
            cssHeight: lastCssH,
        });
    };

    const armDprListener = () => {
        removeDprListener?.();
        const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
        const onChange = () => {
            if (disposed) return;
            emitFallback();
            armDprListener();
        };
        mq.addEventListener('change', onChange, { once: true });
        removeDprListener = () => mq.removeEventListener('change', onChange);
    };

    const ro = new ResizeObserver(entries => {
        const entry = entries[0];
        const cssBox = entry.contentBoxSize?.[0];
        lastCssW = cssBox ? cssBox.inlineSize : entry.contentRect.width;
        lastCssH = cssBox ? cssBox.blockSize : entry.contentRect.height;
        const deviceBox = entry.devicePixelContentBoxSize?.[0];
        if (deviceBox) {
            cb({ width: deviceBox.inlineSize, height: deviceBox.blockSize, cssWidth: lastCssW, cssHeight: lastCssH });
        } else {
            emitFallback();
        }
    });

    try {
        ro.observe(el, { box: 'device-pixel-content-box' });
    } catch {
        ro.observe(el);
        armDprListener();
    }

    return () => {
        disposed = true;
        ro.disconnect();
        removeDprListener?.();
    };
}
