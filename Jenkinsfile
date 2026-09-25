// Jenkinsfile - Declarative pipeline for the 3-tier demo
// Requires Jenkins credentials with ID "dockerhub-creds" (Username + Password)
// pointing at your Docker Hub account.

pipeline {
    agent any

    environment {
        DOCKERHUB_USER = "YOUR_DOCKERHUB_USERNAME"   // <-- change this
        FRONTEND_IMAGE = "${DOCKERHUB_USER}/threetier-frontend"
        BACKEND_IMAGE  = "${DOCKERHUB_USER}/threetier-backend"
        IMAGE_TAG      = "${BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                dir('backend') {
                    sh 'npm install'
                }
            }
        }

        stage('Run Tests') {
            steps {
                dir('backend') {
                    sh 'npm test'
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh "docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} ./backend"
                sh "docker build -t ${FRONTEND_IMAGE}:${IMAGE_TAG} ./frontend"
            }
        }

        stage('Push Images to Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
                    sh "docker push ${BACKEND_IMAGE}:${IMAGE_TAG}"
                    sh "docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}"
                }
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                  docker compose down || true
                  docker compose up -d --build
                '''
            }
        }
    }

    post {
        success {
            echo "Pipeline completed successfully. App is live on port 80."
        }
        failure {
            echo "Pipeline failed. Check the stage logs above."
        }
        always {
            sh 'docker logout || true'
        }
    }
}
