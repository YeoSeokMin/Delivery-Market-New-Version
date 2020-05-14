const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const dbConnection = require('./database');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(express.urlencoded({extended:false}));

// 화면 엔진 ejs 설정
app.set('views', path.join(__dirname,'views'));
app.set('view engine','ejs');

//
app.use(express.static(path.join(__dirname, '/assets')))

// 쿠키 세션 미들웨어
app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2'],
    maxAge:  3600 * 1000 // 1hr
}));

// 미들웨어
const ifNotLoggedin = (req, res, next) => {
    if(!req.session.isLoggedIn){
        return res.render('login-register');
    }
    next();
}

const ifLoggedin = (req,res,next) => {
    if(req.session.isLoggedIn){
        return res.redirect('/home');
    }
    next();
}
// 미들웨어 끝

//스플래시 페이지
app.get('/', function(req, res){
    res.sendFile(__dirname + '/views/splash.html');
});
//메인 페이지
app.get('/main', function(req, res){
    res.sendFile(__dirname + '/views/main.html');
});

// ID확인 SELECT 문
app.get('/login', ifNotLoggedin, (req,res,next) => {
    dbConnection.execute("SELECT `name` FROM `users` WHERE `id`=?",[req.session.userID])
    .then(([rows]) => {
        res.render('home',{
            name:rows[0].name
        });
    });
    
});// ID확인 SELECT 문


// 회원가입 페이지
app.post('/register', ifLoggedin, 
// 입력데이터 확인(Express)
[
    body('user_email','잘못된 이메일 주소입니다.').isEmail().custom((value) => {
        return dbConnection.execute('SELECT `email` FROM `users` WHERE `email`=?', [value])
        .then(([rows]) => {
            if(rows.length > 0){
                return Promise.reject('중복된 이메일 주소입니다.');
            }
            return true;
        });
    }),
    body('user_name','아이디가 공백입니다.').trim().not().isEmpty(),
    body('user_pass','비밀번호는 6자 이상이어야 합니다.').trim().isLength({ min: 6 }),
],// 입력데이터 확인 끝
(req,res,next) => {

    const validation_result = validationResult(req);
    const {user_name, user_pass, user_email} = req.body;
    // 에러없으면
    if(validation_result.isEmpty()){
        // 비밀번호 암호화
        bcrypt.hash(user_pass, 12).then((hash_pass) => {
            // INSERTING USER INTO DATABASE
            dbConnection.execute("INSERT INTO `users`(`name`,`email`,`password`) VALUES(?,?,?)",[user_name,user_email, hash_pass])
            .then(result => {
                res.send(`계정생성이 완료되었습니다. 이제<a href="/login">Login</a>을 해보세요.`);

                console.log("새로운 회원 생성");
                console.log("회원 이름 : " + user_name);
                console.log("회원 이메일 : " + user_email);

            }).catch(err => {
                // THROW INSERTING USER ERROR'S
                if (err) throw err;
            });
        })
        .catch(err => {
            // THROW HASING ERROR'S
            if (err) throw err;
        })
    }
    else{
        // 유효성검사
        let allErrors = validation_result.errors.map((error) => {
            return error.msg;
        });
        // REDERING login-register PAGE WITH VALIDATION ERRORS
        res.render('login-register',{
            register_error:allErrors,
            old_data:req.body
        });
    }
});// 유효성 검사 끝

// 로그인페이지
app.post('/login', ifLoggedin, [
    body('user_email').custom((value) => {
        return dbConnection.execute('SELECT `email` FROM `users` WHERE `email`=?', [value])
        .then(([rows]) => {
            if(rows.length == 1){
                return true;
                
            }
            return Promise.reject('잘못된 이메일 주소입니다.');
            
        });
    }),
    body('user_pass','비밀번호가 공백입니다.').trim().not().isEmpty(),
], (req, res) => {
    const validation_result = validationResult(req);
    const {user_pass, user_email} = req.body;
    if(validation_result.isEmpty()){
        
        dbConnection.execute("SELECT * FROM `users` WHERE `email`=?",[user_email])
        .then(([rows]) => {
            bcrypt.compare(user_pass, rows[0].password).then(compare_result => {
                if(compare_result === true){

                    req.session.isLoggedIn = true;
                    req.session.userID = rows[0].id;

                    res.redirect('/login');
                    console.log("회원 로그인");
                    console.log("회원 이메일 : " + user_email);
                }
                else{
                    res.render('login-register',{
                        login_errors:['잘못된 비밀번호 입니다.']
                    });
                }
            })
            .catch(err => {
                if (err) throw err;
            });


        }).catch(err => {
            if (err) throw err;
        });
    }
    else{
        let allErrors = validation_result.errors.map((error) => {
            return error.msg;
        });
        // 오류있는 페이지 렌더링
        res.render('login-register',{
            login_errors:allErrors
        });
    }
});
// 로그인페이지 끝

// 로그아웃
app.get('/logout',(req,res)=>{
    //session destroy
    req.session = null;
    res.redirect('/login');
});
// 로그아웃 끝

app.use('/login', (req,res) => {
    res.status(404).send('<h1>404 Page Not Found!</h1>');
});

var port = process.env.PORT || 3000; // 1
app.listen(port, function(){
  console.log('서버가 시작됩니다. port : '+port);
});