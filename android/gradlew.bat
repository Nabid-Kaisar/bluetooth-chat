# Gradle wrapper batch script for Windows
@rem
@if "%DEBUG%"=="" @echo off
@rem
@rem Gradle startup script for Windows
@rem
setlocal

@rem Determine the Java command to use to start the JVM.
if defined JAVA_HOME (
    if exist "%JAVA_HOME%/bin/java.exe" (
        set JAVACMD=%JAVA_HOME%/bin/java.exe
        goto execute
    )
)

set JAVACMD=java.exe
%JAVACMD% -version >NUL 2>&1
if %ERRORLEVEL% equ 0 goto execute

echo. 1>&2
echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH. 1>&2
goto fail

:execute
@rem Setup the command line
set CLASSPATH=%APP_HOME%\gradle\wrapper\gradle-wrapper.jar

@rem Execute Gradle
"%JAVACMD%" %DEFAULT_JVM_OPTS% %JAVA_OPTS% %GRADLE_OPTS% "-Dorg.gradle.appname=%APP_BASE_NAME%" -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*

:fail
exit /b %ERRORLEVEL%
