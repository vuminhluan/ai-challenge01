/** Creates an element. props: className, text, or any attribute; falsy props and children are skipped. */
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}

function icon(included) {
  if (included === true) return el("span", { className: "icon icon-yes", "aria-hidden": "true", text: "✓" });
  if (included === false) return el("span", { className: "icon icon-no", "aria-hidden": "true", text: "✗" });
  return null;
}

function bestPill() {
  return el("span", { className: "best-pill", text: "Best" });
}

function planHeader(plan, nameTag) {
  return el("div", { className: `plan-head tier-${plan.tier}` }, [
    plan.isRecommended && el("span", { className: "badge", text: "★ Recommended" }),
    el(nameTag, { className: "plan-name", text: plan.name }),
    plan.tagline && el("p", { className: "tagline", text: plan.tagline }),
  ]);
}

function rowLabel(row) {
  return [
    el("span", { className: "row-label", text: row.label }),
    row.hint && el("span", { className: "row-hint", text: row.hint }),
  ];
}

// The pill comes first: inline before the value on mobile, pinned to the cell corner on desktop.
function cellContent(cell) {
  return [
    cell.isBest && bestPill(),
    el("span", { className: "value" }, [icon(cell.included), cell.text]),
    cell.subtext && el("span", { className: "subtext", text: cell.subtext }),
  ];
}

function cellClass(cell, plan) {
  return ["cell", cell.isBest && "is-best", cell.included === false && "is-excluded", plan.isRecommended && "is-recommended"]
    .filter(Boolean)
    .join(" ");
}

/** Desktop view: one semantic table, plans as columns. */
export function renderTable(vm) {
  const columnCount = vm.plans.length + 1;

  const head = el(
    "thead",
    {},
    el("tr", {}, [
      el("td", { className: "corner" }),
      ...vm.plans.map((plan) =>
        el("th", { scope: "col", className: plan.isRecommended ? "is-recommended" : null }, planHeader(plan, "span")),
      ),
    ]),
  );

  const bodies = vm.groups.map((group) =>
    el("tbody", {}, [
      el("tr", { className: "group-row" }, el("th", { scope: "rowgroup", colspan: String(columnCount), text: group.title })),
      ...group.rows.map((row) =>
        el("tr", {}, [
          el("th", { scope: "row" }, rowLabel(row)),
          ...row.cells.map((cell, index) => el("td", { className: cellClass(cell, vm.plans[index]) }, cellContent(cell))),
        ]),
      ),
    ]),
  );

  return el(
    "div",
    { className: "table-view" },
    el("table", { className: "compare-table" }, [
      el("caption", { className: "visually-hidden", text: "Insurance plan comparison" }),
      head,
      ...bodies,
    ]),
  );
}

/** Mobile view: one card per plan, stacked vertically. */
export function renderCards(vm) {
  return el(
    "div",
    { className: "card-list" },
    vm.plans.map((plan, planIndex) =>
      el("article", { className: `plan-card${plan.isRecommended ? " is-recommended" : ""}`, "aria-label": `${plan.name} plan` }, [
        planHeader(plan, "h2"),
        ...vm.groups.map((group) =>
          el("section", { className: "card-group" }, [
            el("h3", { className: "card-group-title", text: group.title }),
            el(
              "dl",
              {},
              group.rows.flatMap((row) => {
                const cell = row.cells[planIndex];
                return [el("dt", {}, rowLabel(row)), el("dd", { className: cellClass(cell, plan) }, cellContent(cell))];
              }),
            ),
          ]),
        ),
      ]),
    ),
  );
}

/** Legend and the explanation of the recommended plan. */
export function renderNotes(vm) {
  const { planName, formula } = vm.recommendation;
  return el("div", { className: "notes" }, [
    el("p", { className: "legend" }, [
      el("span", {}, [icon(true), " Included"]),
      el("span", {}, [icon(false), " Not included"]),
      el("span", {}, [bestPill(), " Best value in the row"]),
    ]),
    el("p", {}, [
      el("strong", { text: `Why ${planName} is recommended: ` }),
      `it pays out the most per $1 of premium. Coverage per $1 premium = ${formula}. ` +
        "This compares maximum payouts, not how much you are likely to use.",
    ]),
  ]);
}
