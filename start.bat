@echo off
SETLOCAL

echo ==============================================================
echo VyManager - Setup and Launch
echo ==============================================================

REM Check if Python is installed
where python >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher from https://www.python.org/
    pause
    exit /b 1
)

REM Check Python version
python --version | findstr /r "3\.[89]\|3\.1[0-9]" >nul
IF %ERRORLEVEL% NEQ 0 (
    echo WARNING: Python version may not be compatible
    echo Recommended: Python 3.8 or higher
    choice /C YN /M "Continue anyway?"
    IF %ERRORLEVEL% EQU 2 exit /b 1
)

REM Create virtual environment if it doesn't exist
IF NOT EXIST venv (
    echo Creating virtual environment...
    python -m venv venv
    IF %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install requirements
echo Checking and installing dependencies...
pip install -r requirements.txt
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

REM Check if .env file exists and load it
IF EXIST .env (
    echo Loading environment variables from .env
    FOR /F "tokens=*" %%i IN (.env) DO (
        SET %%i
    )
) ELSE (
    echo WARNING: .env file not found. Creating from sample...
    IF EXIST .env.sample (
        copy .env.sample .env
        echo Created .env from sample. Please edit it with your settings.
        notepad .env
    ) ELSE (
        echo ERROR: .env.sample not found. Cannot create configuration.
        pause
        exit /b 1
    )
)

REM Set default values if not provided in .env
IF "%PORT%"=="" SET PORT=3001
IF "%HOST%"=="" SET HOST=0.0.0.0
IF "%WORKERS%"=="" SET WORKERS=4
IF "%ENVIRONMENT%"=="" SET ENVIRONMENT=development

echo ==============================================================
echo Starting VyOS Configuration Viewer in %ENVIRONMENT% mode...
echo Host: %HOST%
echo Port: %PORT%
echo ==============================================================

IF "%ENVIRONMENT%"=="production" (
    echo Running in production mode on %HOST%:%PORT%
    echo Note: Gunicorn is not supported on Windows, using Uvicorn with workers instead
    python -m uvicorn main:app --host %HOST% --port %PORT% --workers %WORKERS%
) ELSE (
    echo Running with Uvicorn on %HOST%:%PORT%
    python -m uvicorn main:app --host %HOST% --port %PORT% --reload
)

REM Keep the command window open if there was an error
IF %ERRORLEVEL% NEQ 0 (
    echo Application exited with error code %ERRORLEVEL%
    pause
)

ENDLOCAL 