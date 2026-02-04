"use client";

import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from "jwt-decode";

export default function Login() {
    const [isRegistering, setIsRegistering] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);

        const response = await fetch('http://localhost:3342/api/token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: formData.get('email'),
                password: formData.get('password'),
            }),
        });

        if (response.ok) {
            const data = await response.json();
            console.log("data:", data);

            const decoded = jwtDecode<{ user_id: string }>(data.access);
            const user_id = decoded.user_id;

            localStorage.setItem('jwt_access', data.access);
            localStorage.setItem('token', data.access);
            localStorage.setItem('user_id', user_id)
            alert('Login success!');
            router.push('/homepage');
        } else {
            alert('Invalid email or password');
        }
    };

    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);

        const response = await fetch('http://localhost:3342/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: formData.get('email'),
                password: formData.get('password'),
                username: formData.get('username'),
            }),
        });

        if (response.ok) {
            alert('Register success! Please login.');
            setIsRegistering(false);
        } else {
            alert('Registration failed');
        }
    };

    return (
        <>
            <Head>
                <title>{isRegistering ? 'Register' : 'Login'}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link
                    rel="stylesheet"
                    href="https://cdn.lineicons.com/4.0/lineicons.css"
                />
            </Head>

            <main>
                <div className={`container ${isRegistering ? 'right-panel-active' : ''}`} id="container">
                    <div className="form-container register-container">
                        <form onSubmit={handleRegister}>
                            <h1>Register</h1>
                            <input type="text" name="username" placeholder="Name" required />
                            <input type="email" name="email" placeholder="Email" required />
                            <input type="password" name="password" placeholder="Password" required />
                            <button type="submit">Register</button>
                            <div className="mobile-toggle">
                                <p>Already have an account?</p>
                                <button type="button" className="toggle-btn" onClick={() => setIsRegistering(false)}>
                                    Sign In
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="form-container login-container">
                        <form onSubmit={handleLogin}>
                            <h1>Login</h1>
                            <input type="email" name="email" placeholder="Email" required />
                            <input type="password" name="password" placeholder="Password" required />
                            <div className="content">
                                <div className="checkbox">
                                    <input type="checkbox" />
                                    <label>Remember me</label>
                                </div>
                                <div className="pass-link">
                                    <a href="#">Forgot password</a>
                                </div>
                            </div>
                            <button type="submit">Login</button>
                            <div className="mobile-toggle">
                                <p>Don't have an account?</p>
                                <button type="button" className="toggle-btn" onClick={() => setIsRegistering(true)}>
                                    Create Account
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="overlay-container">
                        <div className="overlay">
                            <div className="overlay-panel overlay-left">
                                <h1 className="title">Hello <br /> friends</h1>
                                <p>if you have an account, login here and searching the data</p>
                                <button className="ghost" onClick={() => setIsRegistering(false)}>
                                    Login <i className="lni lni-arrow-left login"></i>
                                </button>
                            </div>
                            <div className="overlay-panel overlay-right">
                                <h1 className="title">Start you <br /> journy now</h1>
                                <p>if you don&apos;t have an account yet, join us and start your journey</p>
                                <button className="ghost" onClick={() => setIsRegistering(true)}>
                                    Register <i className="lni lni-arrow-right register"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <style jsx>{`
                @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap");

                * {
                    box-sizing: border-box;
                }

                main {
                    display: flex;
                    background-color: #f6f5f7;
                    justify-content: center;
                    align-items: center;
                    flex-direction: column;
                    font-family: "Poppins", sans-serif;
                    overflow: hidden;
                    min-height: 100vh;
                    padding: 20px;
                }

                h1 {
                    font-size: clamp(24px, 2vw, 32px);
                    margin: 0;
                    margin-bottom: 15px;
                }

                h1.title {
                    font-size: clamp(28px, 2.5vw, 36px);
                    line-height: 1.3;
                    margin: 0;
                    text-shadow: 0 0 10px rgba(16, 64, 74, 0.5);
                }

                p {
                    font-size: clamp(12px, 0.9vw, 14px);
                    line-height: 1.6;
                    letter-spacing: 0.3px;
                    margin: 15px 0 20px;
                    text-shadow: 0 0 10px rgba(16, 64, 74, 0.5);
                }

                a {
                    color: #333;
                    font-size: clamp(12px, 0.9vw, 14px);
                    text-decoration: none;
                    margin: 15px 0;
                    transition: 0.3s ease-in-out;
                }

                a:hover {
                    color: #4bb6b7;
                }

                .content {
                    display: flex;
                    width: 100%;
                    min-height: 40px;
                    align-items: center;
                    justify-content: space-around;
                    flex-wrap: wrap;
                    gap: 10px;
                }

                .content .checkbox {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .content input {
                    accent-color: #333;
                    width: 16px;
                    height: 16px;
                }

                .content label {
                    font-size: clamp(12px, 0.9vw, 14px);
                    user-select: none;
                    padding-left: 8px;
                }

                button {
                    position: relative;
                    border-radius: 20px;
                    border: 1px solid #4bb6b7;
                    background-color: #4bb6b7;
                    color: #fff;
                    font-size: clamp(13px, 0.9vw, 15px);
                    margin: 10px;
                    padding: 12px 45px;
                    text-transform: capitalize;
                    transition: 0.3s ease-in-out;
                    cursor: pointer;
                    font-weight: 500;
                }

                button:hover {
                    letter-spacing: 1px;
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(75, 182, 183, 0.4);
                }

                button:active {
                    transform: scale(0.95);
                }

                button:focus {
                    outline: none;
                }

                button.ghost {
                    background-color: rgba(225, 225, 225, 0.2);
                    border: 2px solid #fff;
                    color: #fff;
                }

                button.ghost i{
                    position: absolute;
                    opacity: 0;
                    transition: 0.3s ease-in-out;
                }

                button.ghost i.register {
                    right: 70px;
                }

                button.ghost i.login {
                    left: 70px;
                }

                button.ghost:hover i.register {
                    right: 40px;
                    opacity: 1;
                }

                button.ghost:hover i.login {
                    left: 40px;
                    opacity: 1;
                }

                .mobile-toggle {
                    display: none;
                    margin-top: 15px;
                    text-align: center;
                }

                .mobile-toggle p {
                    margin: 10px 0 5px;
                    font-size: 14px;
                    color: #666;
                }

                .mobile-toggle .toggle-btn {
                    background-color: transparent;
                    border: 2px solid #4bb6b7;
                    color: #4bb6b7;
                    padding: 8px 25px;
                    font-size: 14px;
                    margin: 5px 0;
                }

                .mobile-toggle .toggle-btn:hover {
                    background-color: #4bb6b7;
                    color: #fff;
                }


                form {
                    background-color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    padding: 0 40px;
                    height: 100%;
                    text-align: center;
                }

                input {
                    background-color: #eee;
                    border: none;
                    border-radius: 10px;
                    padding: 12px 15px;
                    margin: 8px 0;
                    width: 100%;
                    font-size: clamp(13px, 0.9vw, 15px);
                    font-family: "Poppins", sans-serif;
                }

                .container {
                    background-color: #fff;
                    border-radius: 25px;
                    box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22);
                    position: relative;
                    overflow: hidden;
                    width: 100%;
                    max-width: 900px;
                    min-height: 550px;
                    height: auto;
                }

                .form-container {
                    position: absolute;
                    top: 0;
                    height: 100%;
                    transition: all 0.6s ease-in-out;
                }

                .login-container {
                    left: 0;
                    width: 50%;
                    z-index: 2;
                }

                .container.right-panel-active .login-container {
                    transform: translateX(100%);
                }

                .register-container {
                    left: 0;
                    width: 50%;
                    opacity: 0;
                    z-index: 1;
                }

                .container.right-panel-active .register-container {
                    transform: translateX(100%);
                    opacity: 1;
                    z-index: 5;
                    animation: show 0.6s;
                }

                @keyframes show {
                    0%,
                    49.99% {
                        opacity: 0;
                        z-index: 1;
                    }

                    50%,
                    100% {
                        opacity: 1;
                        z-index: 5;
                    }
                }

                .overlay-container {
                    position: absolute;
                    top: 0;
                    left: 50%;
                    width: 50%;
                    height: 100%;
                    overflow: hidden;
                    transition: transform 0.6s ease-in-out;
                    z-index: 100;
                }

                .container.right-panel-active .overlay-container {
                    transform: translate(-100%);
                }

                .overlay {
                    background-image: url("/img/login_background.gif");
                    background-repeat: no-repeat;
                    background-size: cover;
                    background-position: center;
                    color: #fff;
                    position: relative;
                    left: -100%;
                    height: 100%;
                    width: 200%;
                    transform: translateX(0);
                    transition: transform 0.6s ease-in-out;
                }

                .overlay::before {
                    content: "";
                    position: absolute;
                    left: 0;
                    right: 0;
                    top: 0;
                    bottom: 0;
                    background: linear-gradient(
                        to top,
                        rgba(46, 94, 109, 0.4) 40%,
                        rgba(46, 94, 109, 0)
                    );
                }

                .container.right-panel-active .overlay {
                    transform: translateX(50%);
                }

                .overlay-panel {
                    position: absolute;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    padding: 0 40px;
                    text-align: center;
                    top: 0;
                    height: 100%;
                    width: 50%;
                    transform: translateX(0);
                    transition: transform 0.6s ease-in-out;
                }

                .overlay-left {
                    transform: translateX(-20%);
                }

                .container.right-panel-active .overlay-left {
                    transform: translateX(0);
                }

                .overlay-right {
                    right: 0;
                    transform: translateX(0);
                }

                .container.right-panel-active .overlay-right {
                    transform: translateX(20%);
                }

                /* Tablet Responsive */
                @media (max-width: 1024px) {
                    .container {
                        max-width: 700px;
                        min-height: 500px;
                    }

                    form {
                        padding: 0 30px;
                    }

                    .overlay-panel {
                        padding: 0 30px;
                    }

                    button.ghost i.register,
                    button.ghost i.login {
                        display: none;
                    }
                }

                /* Mobile Responsive */
                @media (max-width: 768px) {
                    main {
                        padding: 10px;
                    }

                    .container {
                        min-height: 450px;
                        border-radius: 15px;
                    }

                    .form-container {
                        width: 100% !important;
                    }

                    .login-container,
                    .register-container {
                        width: 100% !important;
                        left: 0 !important;
                    }

                    .overlay-container {
                        display: none;
                    }

                    .container.right-panel-active .login-container {
                        transform: translateX(-100%);
                        opacity: 0;
                        z-index: 1;
                    }

                    .container.right-panel-active .register-container {
                        transform: translateX(0);
                    }

                    form {
                        padding: 30px 25px;
                    }

                    .mobile-toggle {
                        display: block;
                    }


                    h1 {
                        font-size: 24px;
                        margin-bottom: 10px;
                    }

                    p {
                        font-size: 13px;
                        margin: 10px 0 15px;
                    }

                    input {
                        padding: 10px 12px;
                        margin: 6px 0;
                        font-size: 14px;
                    }

                    button {
                        padding: 10px 35px;
                        font-size: 14px;
                        margin: 8px;
                    }

                    .content {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 8px;
                        min-height: auto;
                    }

                    .content .checkbox,
                    .content .pass-link {
                        width: 100%;
                    }

                    a {
                        font-size: 13px;
                    }
                }

                /* Small Mobile */
                @media (max-width: 480px) {
                    .container {
                        min-height: 400px;
                    }

                    form {
                        padding: 20px 20px;
                    }

                    h1 {
                        font-size: 20px;
                    }

                    button {
                        padding: 10px 30px;
                        font-size: 13px;
                    }

                    input {
                        font-size: 13px;
                    }
                }
            `}</style>
        </>
    );
}
