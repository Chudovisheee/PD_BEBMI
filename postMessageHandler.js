/* ==========================================================================
   postMessageHandler.js — навигация между страницами по postMessage
   (команды от оболочки ридера).
   ========================================================================== */

/* Общее количество страниц книги.
   Должно совпадать с totalStandardPages в assets/ui.js. */
var BOOK_TOTAL_PAGES = 12;

window.addEventListener('message', function (event) {
  if (!event.data || event.data.newPageNumber === undefined) return;

  var pageNumber = parseInt(event.data.newPageNumber, 10);
  if (isNaN(pageNumber)) return;

  var page = (pageNumber <= 1 || pageNumber > BOOK_TOTAL_PAGES) ? 'index' : pageNumber;
  window.location.href = './' + page + '.html';
});
