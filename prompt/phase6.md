# Claude Working Instruction — Debug Missing "Quản lý kho" Sidebar Item

## ROLE

You are a **senior frontend engineer** working on the project `do-an-full`.

---

## CURRENT PROBLEM

A previous change claimed that the sidebar item **"Quản lý kho"** was added into the **"Quản lý"** section.

However, in the actual UI, **the menu item still does not appear**.

This means the previous edit was either:
- made in the wrong file
- made in an unused component
- overridden by another sidebar config
- filtered out by role/render logic
- hidden by layout/conditional rendering

---

## OBJECTIVE

You must debug and fix this properly.

I need a new sidebar item:

- Label: `Quản lý kho`
- Section: `Quản lý`
- Navigation target: `/tong-quan`

When clicked, it must navigate using the app's existing client-side routing.

---

## STRICT RULES

- DO NOT assume the previously edited file is the real rendered sidebar
- DO NOT only patch config and stop
- DO NOT report success unless the item is actually visible in the browser UI
- DO NOT refactor unrelated code
- DO NOT redesign the sidebar

---

## MANDATORY DEBUG METHOD

### Step 1 — Find the actual rendered sidebar
You must identify:
- the actual sidebar component currently mounted in the admin layout
- the actual menu config source used at runtime
- whether there are duplicate sidebar files/components/configs

Examples to verify:
- `AdminSidebar.tsx`
- layout wrapper
- role-based sidebar switch
- merged navigation config
- memoized nav items
- hidden mobile/desktop variants

If a previously edited file is not the one actually used, fix the real one.

---

### Step 2 — Check why the item is not showing
You must verify possible causes, including:
- wrong component edited
- wrong nav config source
- role-based filtering hides the item
- section rendering excludes the new item
- item key/icon breaks rendering
- route normalization issue
- item inserted but not rendered because of conditional map logic
- stale dev server/hot reload issue

---

### Step 3 — Add/fix the item in the real rendered config
Required item:

```ts
{
  label: 'Quản lý kho',
  to: '/tong-quan',
  icon: 'warehouse'
}