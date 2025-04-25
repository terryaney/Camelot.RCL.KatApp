// If I brought in types of bs5, I had more compile errors that I didn't want to battle yet.
declare const bootstrap: BootstrapStatic;

interface BootstrapStatic {
	Modal: {
		new(el: HTMLElement): BootstrapModal;
		getOrCreateInstance(el: HTMLElement): BootstrapModal;
		getInstance(el: HTMLElement): BootstrapModal;
	};
	Popover: {
		new(el: HTMLElement, options: BootstrapTooltipOptions): BootstrapPopover;
		getInstance(el: HTMLElement): BootstrapPopover
	};
	Tooltip: {
		new(el: Element, options: BootstrapTooltipOptions): BootstrapTooltip;
		getInstance(el: Element): BootstrapTooltip
		getOrCreateInstance(el: Element, options?: BootstrapTooltipOptions): BootstrapTooltip;
	}
}

interface BootstrapModal {
	hide: () => void;
	show: (el?: HTMLElement) => void;
}

interface BootstrapPopover {
	hide: () => void;
	show: () => void;
}

interface BootstrapTooltip {
	hide: () => void;
	show: () => void;
	dispose: () => void;
}

type BootstrapTrigger = "click" | "hover" | "focus" | "manual" | "click hover" | "click focus" | "hover focus" | "click hover focus";
type BootstrapPlacement = "auto" | "top" | "bottom" | "left" | "right";
interface BootstrapTooltipOptions {
	html: boolean;
	sanitize: boolean;
	trigger: BootstrapTrigger;
	container: string | Element | false;
	template: string;
	placement: (tooltip: HTMLElement, trigger: HTMLElement) => BootstrapPlacement;
	fallbackPlacements?: string[];
	title: (this: HTMLElement) => string | HTMLElement | undefined;
	content: (this: HTMLElement) => string | HTMLElement | undefined;
	popperConfig?: (this: HTMLElement, defaultBsPopperConfig: PopperConfigOptions) => PopperConfigOptions;
}

interface PopperConfigOptions {
	placement: 'auto' | 'auto-start' | 'auto-end' | 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'right' | 'right-start' | 'right-end' | 'left' | 'left-start' | 'left-end';
	strategy: 'absolute' | 'fixed';
}