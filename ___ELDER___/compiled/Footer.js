'use strict';

function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
let on_destroy;
function create_ssr_component(fn) {
    function $$render(result, props, bindings, slots) {
        const parent_component = current_component;
        const $$ = {
            on_destroy,
            context: new Map(parent_component ? parent_component.$$.context : []),
            // these will be immediately discarded
            on_mount: [],
            before_update: [],
            after_update: [],
            callbacks: blank_object()
        };
        set_current_component({ $$ });
        const html = fn(result, props, bindings, slots);
        set_current_component(parent_component);
        return html;
    }
    return {
        render: (props = {}, options = {}) => {
            on_destroy = [];
            const result = { title: '', head: '', css: new Set() };
            const html = $$render(result, props, {}, options);
            run_all(on_destroy);
            return {
                html,
                css: {
                    code: Array.from(result.css).map(css => css.code).join('\n'),
                    map: null // TODO
                },
                head: result.title + result.head
            };
        },
        $$render
    };
}

/* src/components/Sections/Footer.svelte generated by Svelte v3.24.0 */

const css = {
	code: ".container.svelte-1vhtiuj{width:calc(100% - 50px);--small-max-width:var(--media-lte-sm) 300px;max-width:var(--small-max-width, var(--container-width));margin:0 auto;opacity:0.5;--small-padding:var(--media-lte-sm) 40px 25px 130px 25px;padding:var(--small-padding, 80px 25px 200px 25px);display:grid;--small-grid:var(--media-lte-sm) auto;grid-template-columns:var(--small-grid, auto auto);--small-justify:var(--media-lte-sm) center;justify-content:var(--small-justify, space-between);--text-center:var(--media-lte-sm) center;text-align:var(--text-center, initial);line-height:200%}.design-by.svelte-1vhtiuj{display:grid;--small-justify:var(--media-lte-sm) center;justify-content:var(--small-justify, end)}",
	map: "{\"version\":3,\"file\":\"Footer.svelte\",\"sources\":[\"Footer.svelte\"],\"sourcesContent\":[\"<style>\\n.container {\\n  width: calc(100% - 50px);\\n  --small-max-width: var(--media-lte-sm) 300px;\\n  max-width: var(--small-max-width, var(--container-width));\\n  margin: 0 auto;\\n  opacity: 0.5;\\n  --small-padding: var(--media-lte-sm) 40px 25px 130px 25px;\\n  padding: var(--small-padding, 80px 25px 200px 25px);\\n\\n  display: grid;\\n  --small-grid: var(--media-lte-sm) auto;\\n  grid-template-columns: var(--small-grid, auto auto);\\n\\n  --small-justify: var(--media-lte-sm) center;\\n  justify-content: var(--small-justify, space-between);\\n\\n  --text-center: var(--media-lte-sm) center;\\n  text-align: var(--text-center, initial);\\n\\n  line-height: 200%;\\n}\\n\\n.design-by {\\n  display: grid;\\n  --small-justify: var(--media-lte-sm) center;\\n  justify-content: var(--small-justify, end);\\n}</style>\\n\\n<div class=\\\"container\\\">\\n  <div class=\\\"info\\\">Svelte Summit is a volunteer effort.</div>\\n  <div class=\\\"design-by\\\">\\n    <span>\\n      Design by\\n      <a\\n        target=\\\"_blank\\\"\\n        rel=\\\"noreferrer\\\"\\n        href=\\\"https://twitter.com/mono_company\\\">\\n        @mono_company\\n      </a>\\n    </span>\\n    <span>\\n      Built by\\n      <a target=\\\"_blank\\\" rel=\\\"noreferrer\\\" href=\\\"https://svelte.school\\\">\\n        Svelte School\\n      </a>\\n    </span>\\n  </div>\\n</div>\\n\"],\"names\":[],\"mappings\":\"AACA,UAAU,eAAC,CAAC,AACV,KAAK,CAAE,KAAK,IAAI,CAAC,CAAC,CAAC,IAAI,CAAC,CACxB,iBAAiB,CAAE,yBAAyB,CAC5C,SAAS,CAAE,IAAI,iBAAiB,CAAC,uBAAuB,CAAC,CACzD,MAAM,CAAE,CAAC,CAAC,IAAI,CACd,OAAO,CAAE,GAAG,CACZ,eAAe,CAAE,wCAAwC,CACzD,OAAO,CAAE,IAAI,eAAe,CAAC,qBAAqB,CAAC,CAEnD,OAAO,CAAE,IAAI,CACb,YAAY,CAAE,wBAAwB,CACtC,qBAAqB,CAAE,IAAI,YAAY,CAAC,UAAU,CAAC,CAEnD,eAAe,CAAE,0BAA0B,CAC3C,eAAe,CAAE,IAAI,eAAe,CAAC,cAAc,CAAC,CAEpD,aAAa,CAAE,0BAA0B,CACzC,UAAU,CAAE,IAAI,aAAa,CAAC,QAAQ,CAAC,CAEvC,WAAW,CAAE,IAAI,AACnB,CAAC,AAED,UAAU,eAAC,CAAC,AACV,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,0BAA0B,CAC3C,eAAe,CAAE,IAAI,eAAe,CAAC,IAAI,CAAC,AAC5C,CAAC\"}"
};

const Footer = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	$$result.css.add(css);

	return `<div class="${"container svelte-1vhtiuj"}"><div class="${"info"}">Svelte Summit is a volunteer effort.</div>
  <div class="${"design-by svelte-1vhtiuj"}"><span>Design by
      <a target="${"_blank"}" rel="${"noreferrer"}" href="${"https://twitter.com/mono_company"}">@mono_company
      </a></span>
    <span>Built by
      <a target="${"_blank"}" rel="${"noreferrer"}" href="${"https://svelte.school"}">Svelte School
      </a></span></div></div>`;
});

module.exports = Footer;