# Token Architecture

## Naming Order

Order: prefix > category > component > role > variant > target > state
Source: prompt
Default state: default
CSS name: path segments joined with `-` (`shop/comp/button/color/primary/container/hovered` → `--shop-comp-button-color-primary-container-hovered`)

| Slot | Layers | Values |
|---|---|---|
| prefix | ref, sys, comp | `shop` |
| category | ref, sys, comp | `ref`, `sys`, `comp` |
| component | comp | `button`, `chip`, `card`, `input`, `modal`, `alert` |
| role | ref, sys, comp | `color`, `font`, `size`, `spacing`, `shadow`, `elevation`, `motion` |
| variant | ref, sys, comp | `primary`, `on-primary`, `secondary`, `neutral`, `light`, `dark`, `error` |
| target | sys, comp | `container`, `corner`, `padding`, `border`, `heading`, `label` |
| state | ref, sys, comp | `50`, `sm`, `md`, `bold`, `default`, `hovered`, `disabled`, `selected`, `slower` |

Examples:

- `--shop-ref-color-neutral-5`
- `--shop-sys-color-primary`
- `--shop-comp-button-color-primary-container-hovered`
