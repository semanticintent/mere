<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Inbox — Mere</title>
  <script src="../dist/mere-runtime.js"></script>
</head>
<body style="margin:0">

<workbook theme="classic-light">

  <state>
    <value name="current-tab" type="text" default="inbox"/>
    <value name="messages" type="list"/>
    <value name="selected-message" type="map"/>
    <value name="reply-draft" type="text" default=""/>
  </state>

  <computed>
    <value name="visible-messages" from="messages" where="folder = current-tab"/>
    <value name="unread-count" from="messages" where="read = false" op="count"/>
  </computed>

  <actions>
    <action name="open-message" takes="id">
      set selected-message to messages where id = id
      go-to message-detail
    </action>
    <action name="archive-message" takes="id">
      set messages.folder to "archive" where id = id
      go-to inbox
    </action>
    <action name="send-reply" takes="id">
      add-to messages sender "Me" body reply-draft folder "sent" read "true"
      clear reply-draft
      go-to inbox
    </action>
  </actions>

  <screen name="inbox" ?"mobile inbox with tabs and message list">

    <header>
      <heading>Inbox</heading>
      <badge @unread-count/>
    </header>

    <tab-bar ~current-tab>
      <tab "inbox">Inbox</tab>
      <tab "sent">Sent</tab>
      <tab "archive">Archive</tab>
    </tab-bar>

    <message-list @visible-messages>
      <message-card !open-message with item.id>
        <avatar @item.avatar/>
        <heading @item.sender/>
        <subtitle @item.subject/>
        <timestamp @item.received-at/>
      </message-card>
    </message-list>

    <navigation-bar "bottom">
      <nav-item "inbox">Inbox</nav-item>
      <nav-item "star">Starred</nav-item>
      <nav-item "settings">Settings</nav-item>
    </navigation-bar>

  </screen>

  <screen name="message-detail" ?"full message view with reply, archive, back navigation">

    <header>
      <nav-item "inbox">Back</nav-item>
      <heading @selected-message.subject/>
      <nav-item !archive-message with selected-message.id>Archive</nav-item>
    </header>

    <card>
      <header>
        <avatar @selected-message.avatar/>
        <heading @selected-message.sender/>
        <timestamp @selected-message.received-at/>
      </header>
      <paragraph @selected-message.body/>
    </card>

    <toggle ~selected-message.read>Mark as read</toggle>

    <form>
      <field ~reply-draft placeholder="Write a reply…"/>
      <button !send-reply with selected-message.id>Send</button>
    </form>

  </screen>

</workbook>

<script>
// Seed mock data — in production this lives in persisted state (Milestone 3)
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const store = window.__mereStore;
    if (!store) return;
    store.set('messages', [
      {
        id: '1', folder: 'inbox',
        sender: 'Alice Chen', subject: 'Q2 planning doc is ready for review',
        body: 'Hi — I\'ve finished the Q2 planning document. It covers resource allocation, key milestones, and the three initiatives we discussed last week. Let me know if you want to walk through it together before the Monday standup.',
        avatar: 'AC', 'received-at': new Date(Date.now() - 12 * 60000).toISOString(), read: false,
      },
      {
        id: '2', folder: 'inbox',
        sender: 'Ben Torres', subject: 'Quick question about the API contract',
        body: 'Hey — just wanted to confirm: are we versioning the API at /v1/ or using Accept-Version headers? The backend team has been split on this and we need to lock it in before Thursday.',
        avatar: 'BT', 'received-at': new Date(Date.now() - 47 * 60000).toISOString(), read: false,
      },
      {
        id: '3', folder: 'inbox',
        sender: 'Sara Kim', subject: 'Updated design tokens — please review',
        body: 'Attached are the updated design tokens for the new component library. The main changes are in the spacing scale (we moved to a 4px base) and the color ramp for the accent palette.',
        avatar: 'SK', 'received-at': new Date(Date.now() - 2.5 * 3600000).toISOString(), read: true,
      },
      {
        id: '4', folder: 'inbox',
        sender: 'Marcus Webb', subject: 'Onboarding notes from this morning',
        body: 'Good meeting this morning. Here are my notes: we should prioritise the empty state screens, the loading skeleton, and the error boundary before shipping.',
        avatar: 'MW', 'received-at': new Date(Date.now() - 5 * 3600000).toISOString(), read: true,
      },
      {
        id: '5', folder: 'archive',
        sender: 'Priya Nair', subject: 'Invoice #2041 approved',
        body: 'Your invoice #2041 for March has been approved and will be processed in the next payment run (April 18).',
        avatar: 'PN', 'received-at': new Date(Date.now() - 2 * 86400000).toISOString(), read: true,
      },
    ]);
  }, 50);
});
</script>

</body>
</html>
