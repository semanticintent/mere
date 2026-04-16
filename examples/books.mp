<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Books — Mere</title>
  <script src="../dist/mere-runtime.js"></script>
</head>
<body style="margin:0">

<workbook theme="notion-paper">

  <state>
    <value name="books" type="list" persist/>
    <value name="selected-book" type="map"/>
    <value name="current-tab" type="text" default="all"/>
    <value name="new-title" type="text" default=""/>
    <value name="new-author" type="text" default=""/>
    <value name="new-rating" type="text" default=""/>
  </state>

  <computed>
    <value name="visible-books" from="books" where="status = current-tab"/>
    <value name="total-books" from="books" op="count"/>
    <value name="finished-count" from="books" where="status = finished" op="count"/>
    <value name="reading-count" from="books" where="status = reading" op="count"/>
  </computed>

  <actions>
    <action name="open-book" takes="id">
      set selected-book to books where id = id
      go-to book-detail
    </action>
    <action name="mark-finished" takes="id">
      set books.status to "finished" where id = id
      go-to library
    </action>
    <action name="add-book">
      add-to books title new-title author new-author status "want-to-read" rating new-rating
      clear new-title
      clear new-author
      clear new-rating
      go-to library
    </action>
    <action name="show-all">
      set current-tab to "all"
    </action>
  </actions>

  <screen name="library" ?"personal book library with status tabs and book card list">

    <header>
      <heading>My Books</heading>
      <badge @total-books/>
    </header>

    <card ?"summary stats for finished and currently reading counts">
      <heading>Reading stats</heading>
      <subtitle @reading-count/>
      <subtitle @finished-count/>
    </card>

    <tab-bar ~current-tab>
      <tab "all">All</tab>
      <tab "reading">Reading</tab>
      <tab "finished">Finished</tab>
      <tab "want-to-read">Want to Read</tab>
    </tab-bar>

    <card-list @visible-books>
      <card !open-book with item.id>
        <heading @item.title/>
        <subtitle @item.author/>
        <badge @item.status/>
        <badge @item.rating/>
      </card>
    </card-list>

    <navigation-bar "bottom">
      <nav-item "library">Library</nav-item>
      <nav-item "add-book-screen">Add Book</nav-item>
    </navigation-bar>

  </screen>

  <screen name="book-detail" ?"full book detail view with title, author, status, rating, and mark-finished action">

    <header>
      <nav-item "library">Back</nav-item>
      <heading @selected-book.title/>
    </header>

    <card>
      <heading @selected-book.title/>
      <subtitle @selected-book.author/>
      <badge @selected-book.status/>
      <paragraph @selected-book.rating/>
    </card>

    <button !mark-finished with selected-book.id>Mark as Finished</button>

  </screen>

  <screen name="add-book-screen" ?"form to add a new book with title, author, and optional rating">

    <header>
      <nav-item "library">Cancel</nav-item>
      <heading>Add Book</heading>
    </header>

    <form>
      <field ~new-title placeholder="Title" required/>
      <field ~new-author placeholder="Author" required/>
      <field ~new-rating placeholder="Rating (e.g. 4/5)"/>
      <button !add-book>Add to Library</button>
    </form>

  </screen>

</workbook>

<script>
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const store = window.__mereStore;
    if (!store) return;
    store.set('books', [
      { id: '1', title: 'The Remains of the Day',      author: 'Kazuo Ishiguro',   status: 'finished',      rating: '5/5' },
      { id: '2', title: 'Piranesi',                    author: 'Susanna Clarke',   status: 'finished',      rating: '5/5' },
      { id: '3', title: 'A Gentleman in Moscow',       author: 'Amor Towles',      status: 'reading',       rating: ''    },
      { id: '4', title: 'The Overstory',               author: 'Richard Powers',   status: 'reading',       rating: ''    },
      { id: '5', title: 'Exhalation',                  author: 'Ted Chiang',       status: 'want-to-read',  rating: ''    },
      { id: '6', title: 'The Name of the Wind',        author: 'Patrick Rothfuss', status: 'want-to-read',  rating: ''    },
      { id: '7', title: 'Never Let Me Go',             author: 'Kazuo Ishiguro',   status: 'finished',      rating: '4/5' },
      { id: '8', title: 'Project Hail Mary',           author: 'Andy Weir',        status: 'finished',      rating: '5/5' },
    ]);
  }, 50);
});
</script>

</body>
</html>
