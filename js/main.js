import { PLANS, TAGLINES } from "./data.js";
import { renderCards, renderNotes, renderTable } from "./render.js";
import { ROWS } from "./rows.js";
import { buildViewModel } from "./viewModel.js";

const vm = buildViewModel(PLANS, ROWS, TAGLINES);
document.getElementById("app").append(renderTable(vm), renderCards(vm), renderNotes(vm));
