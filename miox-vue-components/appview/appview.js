/**
 * appview
 * @param Component
 * @returns {AppView}
 */
export default function(Component){
    class AppView extends Component {
        constructor(){
            super();
        }

        computed(computed){
            computed.style = function(){
                if ( this.blank ){
                    return {
                        'padding-top': this.blank || 20
                    }
                }
            };
        }

        template(){
            return `<div class="mx-appview" role="appview" :class="{'mx-appview-horizontal': horizontal}" :style="style"><slot></slot></div>`;
        }

        props(props){
            props.blank = Number;
            props.horizontal = Boolean;
        }
    }
    return AppView;
}
