<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Habits — Mere</title>
  <script src="../dist/mere-runtime.js"></script>
</head>
<body style="margin:0">

<workbook theme="brutalist">

  <state>
    <value name="habits" type="list"/>
    <value name="selected-habit" type="map"/>
    <value name="new-habit-name" type="text" default=""/>
    <value name="current-view" type="text" default="today"/>
  </state>

  <computed>
    <value name="done-today" from="habits" where="done = true" op="count"/>
    <value name="total-habits" from="habits" op="count"/>
  </computed>

  <actions>
    <action name="mark-done" takes="id">
      set habits.done to "true" where id = id
    </action>
    <action name="mark-undone" takes="id">
      set habits.done to "false" where id = id
    </action>
    <action name="open-habit" takes="id">
      set selected-habit to habits where id = id
      go-to habit-detail
    </action>
    <action name="add-habit" takes="">
      add-to habits name new-habit-name done "false" streak "0"
      clear new-habit-name
      go-to today
    </action>
  </actions>

  <screen name="today" ?"daily habit tracker with completion list and progress">

    <header>
      <heading>Today</heading>
      <badge @done-today/>
    </header>

    <card>
      <heading>Progress</heading>
      <subtitle @done-today/>
      <subtitle @total-habits/>
    </card>

    <list @habits>
      <card !open-habit with item.id>
        <heading @item.name/>
        <subtitle @item.streak/>
        <toggle ~item.done>Done</toggle>
      </card>
    </list>

    <navigation-bar "bottom">
      <nav-item "today">Today</nav-item>
      <nav-item "add-habit-screen">Add</nav-item>
    </navigation-bar>

  </screen>

  <screen name="habit-detail" ?"single habit view with streak and history">

    <header>
      <nav-item "today">Back</nav-item>
      <heading @selected-habit.name/>
    </header>

    <card>
      <heading>Streak</heading>
      <subtitle @selected-habit.streak/>
      <toggle ~selected-habit.done>Mark done today</toggle>
    </card>

  </screen>

  <screen name="add-habit-screen" ?"add a new habit form">

    <header>
      <nav-item "today">Cancel</nav-item>
      <heading>New Habit</heading>
    </header>

    <form>
      <field ~new-habit-name placeholder="e.g. Read for 20 minutes"/>
      <button !add-habit>Add Habit</button>
    </form>

  </screen>

</workbook>

<script>
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const store = window.__mereStore;
    if (!store) return;
    store.set('habits', [
      { id: '1', name: 'Read for 20 minutes',   done: false, streak: '12 days' },
      { id: '2', name: 'Morning walk',           done: true,  streak: '5 days'  },
      { id: '3', name: 'No social media before noon', done: false, streak: '3 days' },
      { id: '4', name: 'Write 200 words',        done: false, streak: '0 days'  },
      { id: '5', name: 'Drink 8 glasses of water', done: true, streak: '21 days' },
    ]);
  }, 50);
});
</script>

</body>
</html>
