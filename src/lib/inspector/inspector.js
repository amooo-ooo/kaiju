class InspectorElement extends HTMLElement {
    static presets = {
        minimal: [
            'showOutline',
            'showTooltip',
        ],
        devtools: [
            'showContent',
            'showPadding',
            'showMargin',
            'showGridlines'
        ]
    };

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        this.editing = true;
        
        this.showContent = false;
        this.showPadding = false;
        this.showMargin = false;
        this.showOutline = false;
        this.showGridlines = false;
        this.showTooltip = false;

        this.elements = {};
        this.lastEl = null;

        this.setDisplayPreset('devtools');
    }

    setDisplayPreset(name) {
        const presetFlags = InspectorElement.presets[name];
        if (!presetFlags) {
            console.warn(`Inspector preset "${name}" not found.`);
            return;
        }

        presetFlags.forEach(flag => {
            this[flag] = true;
        });

        if (this.lastEl) {
            this.updateInspector(this.lastEl);
        }
    }
    
    connectedCallback() {
        this.initStyles();
        this.createElements();
        this.attachEventListeners();
    }
    
    async initStyles() {
        try {
            const { default: css } = await import('./styles.css?inline');
            const style = new CSSStyleSheet();
            style.replaceSync(css);

            this.shadowRoot.adoptedStyleSheets = [
                ...(this.shadowRoot.adoptedStyleSheets || []),
                style
            ];
        } catch (error) {
            console.error('Failed to load styles for InspectorElement:', error);
        }
    }

    createElements() {
        const types = ['margin', 'border', 'padding', 'content', 'outline'];
        const sides = ['top', 'right', 'bottom', 'left'];
        
        types.forEach(type => {
            if (type === 'content' || type === 'outline') {
                this.elements[type] = this.createElement(type);
            } else {
                this.elements[type] = {};
                sides.forEach(side => {
                    this.elements[type][side] = this.createElement(type);
                });
            }
        });
        
        this.elements.gridlines = {
            top: this.createElement('gridline-h'),
            bottom: this.createElement('gridline-h'),
            left: this.createElement('gridline-v'),
            right: this.createElement('gridline-v'),
        };
        
        // ADDED: Create the tooltip element
        this.elements.tooltip = this.createElement('tooltip');
    }
    
    createElement(type) {
        const div = document.createElement('div');
        div.className = `inspector-element inspector-${type}`;
        this.shadowRoot.appendChild(div);
        return div;
    }
    
    hideAll() {
        this.elements.content.style.display = "none";
        this.elements.outline.style.display = "none";
        this.elements.tooltip.style.display = "none"; 

        ['margin', 'border', 'padding'].forEach(type => {
            ['top', 'right', 'bottom', 'left'].forEach(side => {
                this.elements[type][side].style.display = "none";
            });
        });

        Object.values(this.elements.gridlines).forEach(el => el.style.display = "none");
        
        this.lastEl = null;
    }
    
    attachEventListeners() {
        document.addEventListener("mousemove", (e) => {
            if (!this.editing) {
                this.hideAll();
                return;
            }
            
            const el = this.getTargetElement(e);
            if (!el || el === this.lastEl) return;
            
            this.lastEl = el;
            this.updateInspector(el);
        });
    }
    
    getTargetElement(e) {
        const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
        
        return elementsAtPoint.find(el => 
            el !== this && 
            !this.shadowRoot.contains(el) && 
            el !== document.documentElement && 
            el !== document.body
        ) || null;
    }
    
    updateInspector(el) {
        const rect = el.getBoundingClientRect();
        const computed = window.getComputedStyle(el);
        const values = this.parseBoxModelValues(computed);
        
        this.updateContentArea(rect, values);
        this.updateBoxModelAreas(rect, values);
        this.updateOutlineArea(rect);
        this.updateGridlines(rect);
        this.updateTooltip(el, rect); 
    }
    
    updateTooltip(el, rect) {
        if (!this.showTooltip) {
            this.elements.tooltip.style.display = "none";
            return;
        }

        this.elements.tooltip.textContent = el.tagName.toLowerCase();
        
        this.setElementStyle(this.elements.tooltip, {
            display: "block",
            top: rect.top,
            left: rect.left,
        });
    }

    parseBoxModelValues(computed) {
        const parsePx = (value) => parseFloat(value) || 0;
        const sides = ['Top', 'Right', 'Bottom', 'Left'];
        const values = {};
        
        ['margin', 'border', 'padding'].forEach(property => {
            values[property] = {};
            sides.forEach(side => {
                const prop = property === 'border' ? `${property}${side}Width` : `${property}${side}`;
                values[property][side.toLowerCase()] = parsePx(computed[prop]);
            });
        });
        
        return values;
    }
    
    updateContentArea(rect, values) {
        if (!this.showContent) {
            this.elements.content.style.display = "none";
            return;
        }
        
        const { border, padding } = values;
        const contentLeft = rect.left + border.left + padding.left;
        const contentTop = rect.top + border.top + padding.top;
        const contentWidth = rect.width - (border.left + border.right) - (padding.left + padding.right);
        const contentHeight = rect.height - (border.top + border.bottom) - (padding.top + padding.bottom);
        
        this.setElementStyle(this.elements.content, {
            display: "block",
            left: contentLeft,
            top: contentTop,
            width: Math.max(0, contentWidth),
            height: Math.max(0, contentHeight)
        });
    }

    updateOutlineArea(rect) {
        if (!this.showOutline) {
            this.elements.outline.style.display = "none";
            return;
        }

        this.setElementStyle(this.elements.outline, {
            display: "block",
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
        });
    }

    updateGridlines(rect) {
        if (!this.showGridlines) {
            Object.values(this.elements.gridlines).forEach(el => el.style.display = "none");
            return;
        }

        this.setElementStyle(this.elements.gridlines.top, { display: 'block', top: rect.top, left: 0, width: '100vw' });
        this.setElementStyle(this.elements.gridlines.bottom, { display: 'block', top: rect.bottom, left: 0, width: '100vw' });
        this.setElementStyle(this.elements.gridlines.left, { display: 'block', top: 0, left: rect.left, height: '100vh' });
        this.setElementStyle(this.elements.gridlines.right, { display: 'block', top: 0, left: rect.right, height: '100vh' });
    }
    
    updateBoxModelAreas(rect, values) {
        const configs = [
            { type: 'margin', show: this.showMargin },
            { type: 'border', show: true },
            { type: 'padding', show: this.showPadding }
        ];
        
        configs.forEach(({ type, show }) => {
            this.showBoxModelSides(type, rect, values, show);
        });
    }
    
    showBoxModelSides(type, rect, values, shouldShow) {
        const sides = ['top', 'right', 'bottom', 'left'];
        
        if (!shouldShow || !Object.values(values[type]).some(v => v > 0)) {
            sides.forEach(side => {
                this.elements[type][side].style.display = "none";
            });
            return;
        }
        
        const bounds = this.calculateBounds(type, rect, values);
        const sideCalculators = {
            top: () => ({ left: bounds.outer.left, top: bounds.outer.top, width: bounds.outer.width, height: values[type].top }),
            right: () => ({ left: bounds.inner.left + bounds.inner.width, top: bounds.outer.top + values[type].top, width: values[type].right, height: bounds.outer.height - values[type].top - values[type].bottom }),
            bottom: () => ({ left: bounds.outer.left, top: bounds.inner.top + bounds.inner.height, width: bounds.outer.width, height: values[type].bottom }),
            left: () => ({ left: bounds.outer.left, top: bounds.outer.top + values[type].top, width: values[type].left, height: bounds.outer.height - values[type].top - values[type].bottom })
        };
        
        sides.forEach(side => {
            const shouldShowSide = values[type][side] > 0;
            if (shouldShowSide) {
                const dimensions = sideCalculators[side]();
                this.setElementStyle(this.elements[type][side], {
                    display: "block",
                    ...dimensions
                });
            } else {
                this.elements[type][side].style.display = "none";
            }
        });
    }
    
    calculateBounds(type, rect, values) {
        const configs = {
            margin: {
                outer: { left: rect.left - values.margin.left, top: rect.top - values.margin.top, width: rect.width + values.margin.left + values.margin.right, height: rect.height + values.margin.top + values.margin.bottom },
                inner: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
            },
            border: {
                outer: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                inner: { left: rect.left + values.border.left, top: rect.top + values.border.top, width: rect.width - values.border.left - values.border.right, height: rect.height - values.border.top - values.border.bottom }
            },
            padding: {
                outer: { left: rect.left + values.border.left, top: rect.top + values.border.top, width: rect.width - values.border.left - values.border.right, height: rect.height - values.border.top - values.border.bottom },
                inner: { left: rect.left + values.border.left + values.padding.left, top: rect.top + values.border.top + values.padding.top, width: rect.width - (values.border.left + values.border.right) - (values.padding.left + values.padding.right), height: rect.height - (values.border.top + values.border.bottom) - (values.padding.top + values.padding.bottom) }
            }
        };
        
        return configs[type];
    }
    
    setElementStyle(element, styles) {
        Object.entries(styles).forEach(([key, value]) => {
            element.style[key] = typeof value === 'number' ? `${value}px` : value;
        });
    }
}
customElements.define('kaiju-inspector', InspectorElement);
// Initialize inspector
const inspector = document.createElement('kaiju-inspector');
document.body.prepend(inspector);
window.inspector = inspector;
