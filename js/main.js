import View from './view.js';

const ws = new WebSocket("ws://localhost:8080");

const auth = document.querySelector('.auth');
const authInputName = document.querySelector('.auth__name');
const authInputNick = document.querySelector('.auth__nick');
const authButton = document.querySelector('.auth__button');

const chatWindow = document.querySelector('.global');

const messageInput = document.querySelector('.message__input');
const sendButton = document.querySelector('.message__button');
const messageContainer = document.querySelector('.message-container');

const userInfo = document.querySelector('.user-info');
const userAvatar = document.querySelector('.user__avatar');
const userName = document.querySelector('.user__name');
const userNick = document.querySelector('.user__nick');


const userOnline = document.querySelector('.user-online');
const usersOnline = document.querySelector('.user-online__number');
let usersNumber;

const photo = document.querySelector('.photo');
const photoContainer = document.querySelector('#loadingAvatar');
const photoSave = document.querySelector('#photo__save');
const photoCancel = document.querySelector('#photo__cancel');

let avatar;

let users = [];

ws.onopen = function (e) {
    console.log("[open] Соединение установлено");
    authorization();
};

ws.onmessage = function (message) {
    let messageBody = JSON.parse(message.data);
    console.log(`[message] Данные получены с сервера: ${JSON.stringify(messageBody)}`);

    if (messageBody.type == 'allUsers') {
        users = messageBody.allUsers;
        userOnline.innerHTML = '';
        usersNumber = 0;
        users.forEach(user => {
            if (user.online === true) {
                addOnlineUsers(user);
            }
        })
    } else if (messageBody.type == 'history') {
        messageBody.messages.forEach(item => {
            addMessage(item);
        })
    } else if (messageBody.content.type == 'newUser') {
        addUser(messageBody);
    } else if (messageBody.content.type == 'photo') {
        addAvatar(messageBody);
    } else if (messageBody.content.type == 'message') {
        addMessage(messageBody);
    }
};

ws.onerror = function () {
    console.log(`[error] ${error.message}`);
};

function changeWindow(closeWindow, openWindow) {
    closeWindow.classList.remove('show');
    closeWindow.classList.add('hide');
    openWindow.classList.remove('hide');
    openWindow.classList.add('show');
}

function authorization() {
    authButton.addEventListener('click', (e) => {
        e.preventDefault();

        if (authInputName.value != '' && authInputNick.value != '') {
            changeWindow(auth, chatWindow);

            userAvatar.lastElementChild.src = 'img/photo-camera.png';
            userAvatar.dataset.nick = authInputNick.value;
            userName.innerHTML = authInputName.value;
            userNick.innerHTML = authInputNick.value;

            let IsItOldUser = false;
            let oldUser;
            users.forEach(user => {
                if (user.nick === authInputNick.value) {
                    IsItOldUser = true;
                    oldUser = user;
                }
            })

            if (IsItOldUser == true) {
                userAvatar.lastElementChild.src = oldUser.photo;

                ws.send(JSON.stringify({
                    type: 'oldUser',
                    data: {
                        name: oldUser.name,
                        nick: oldUser.nick,
                        photo: oldUser.photo,
                        online: true
                    }
                }));
            } else {
                ws.send(JSON.stringify({
                    type: 'newUser',
                    data: {
                        name: authInputName.value,
                        nick: authInputNick.value,
                        photo: 'img/photo-camera.png',
                        online: true
                    }
                }));
            }
        } else if (authInputName.value === '' && authInputNick.value === '') {
            authInputName.classList.add('auth__input_error');
            authInputNick.classList.add('auth__input_error');
        } else if (authInputName.value === '') {
            authInputName.classList.add('auth__input_error');
            authInputNick.classList.remove('auth__input_error');
        } else if (authInputNick.value === '') {
            authInputNick.classList.add('auth__input_error');
            authInputName.classList.remove('auth__input_error');
        }
    });
}

function addUser(message) {
    users.push({
        photo: message.content.data.photo,
        name: message.content.data.name,
        nick: message.content.data.nick
    });
}

function addOnlineUsers(user) {
    let onlineUserContainer = document.createElement('div');
    onlineUserContainer.classList.add('user-info');
    onlineUserContainer.classList.add('user_online');
    onlineUserContainer.innerHTML = View.render('userOnlineTemplate', user);
    userOnline.append(onlineUserContainer);

    usersNumber = usersNumber + 1;
    console.log('function add', usersNumber);
    usersOnline.innerText = usersNumber;
}

function sendMessage() {
    if (messageInput.value != '') {
        ws.send(JSON.stringify({
            type: 'message',
            data: messageInput.value
        }));
        messageInput.value = '';
    }
}

sendButton.addEventListener('click', (e) => {
    e.preventDefault();
    sendMessage();
});

function addMessage(message) {
    let newMessage = {
        name: message.client.name,
        nick: message.client.nick,
        photo: message.client.photo,
        messageText: message.content.data,
        time: message.content.time
    }

    let newMessageContainer = document.createElement('div');
    newMessageContainer.classList.add('message-item');
    newMessageContainer.innerHTML = View.render('messageTemplate', newMessage);

    if (newMessage.nick === userAvatar.dataset.nick) {
        newMessageContainer.classList.add('message_my');
        newMessageContainer.firstElementChild.classList.add('message_my__avatar');
        newMessageContainer.lastElementChild.classList.add('message_my__content');
    }

    messageContainer.append(newMessageContainer);
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

function addAvatar(message) {
    let serverNick = message.client.nick;
    let serverName = message.client.name;

    users.forEach(user => {
        if (serverName == user.name && serverNick == user.nick) {
            user.photo = message.content.data;
            const avatarUrl = user.photo;
            searchAvatarContainer(chatWindow, avatarUrl, serverNick);
        }
    });
}

function searchAvatarContainer(where, url, serverNick) {
    const children = [...where.children];
    for (const element of children) {
        if (element.parentNode.classList.contains('user__avatar') && element.parentNode.dataset.nick == serverNick) {
            element.src = url;
        }

        if (element.children.length > 0) {
            searchAvatarContainer(element, url, serverNick);
        }
    }
}

function loadAvatar(input) {
    changeWindow(chatWindow, photo);
    const file = input.files[0];

    if (file) {
        const fileReader = new FileReader();

        fileReader.onloadend = function (e) {
            photoContainer.src = fileReader.result;
            avatar = fileReader.result;
        };

        fileReader.readAsDataURL(file);
    }

    photoSave.addEventListener('click', (e) => {
        e.preventDefault();
        ws.send(JSON.stringify({
            type: 'photo',
            data: avatar
        }));
        changeWindow(photo, chatWindow);
    });

    photoCancel.addEventListener('click', (e) => {
        e.preventDefault();
        changeWindow(photo, chatWindow);
    });
}

userInfo.addEventListener('change', (e) => {
    const element = e.target;

    if (element.classList.contains('user__photo')) {
        loadAvatar(element);
    }
});