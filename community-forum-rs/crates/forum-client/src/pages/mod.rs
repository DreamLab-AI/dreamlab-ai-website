//! Page components for the forum routes.

mod admin;
mod channel;
mod chat;
mod dm_chat;
mod dm_list;
mod home;
mod login;
mod signup;

pub use admin::AdminPage;
pub use channel::ChannelPage;
pub use chat::ChatPage;
pub use dm_chat::DmChatPage;
pub use dm_list::DmListPage;
pub use home::HomePage;
pub use login::LoginPage;
pub use signup::SignupPage;
